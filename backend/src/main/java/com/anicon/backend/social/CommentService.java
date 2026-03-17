package com.anicon.backend.social;

import java.util.*;
import java.util.stream.Collectors;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.impl.DSL;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.notification.NotificationEvent;
import com.anicon.backend.notification.NotificationService;

import com.anicon.backend.social.dto.CommentResponse;
import com.anicon.backend.social.dto.CreateCommentRequest;
import com.anicon.backend.social.dto.PostAuthorResponse;

import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

@Service
public class CommentService {

    private final PostCommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final PostRepository postRepository;
    private final DSLContext dsl;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    public CommentService(PostCommentRepository commentRepository,
                          CommentLikeRepository commentLikeRepository,
                          PostRepository postRepository,
                          DSLContext dsl,
                          ApplicationEventPublisher eventPublisher,
                          NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.postRepository = postRepository;
        this.dsl = dsl;
        this.eventPublisher = eventPublisher;
        this.notificationService = notificationService;
    }

    /**
     * Get all comments for a post, structured as a tree (top-level + nested replies).
     * Returns top-level comments with their replies populated.
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(UUID postId, UUID currentUserId) {
        List<PostComment> allComments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
        if (allComments.isEmpty()) return List.of();

        // Batch-fetch author profiles for all comment authors
        List<UUID> authorIds = allComments.stream().map(PostComment::getUserId).distinct().toList();
        Map<UUID, PostAuthorResponse> authors = batchFetchAuthors(authorIds);

        // Batch-fetch liked status for current user
        Set<UUID> likedIds = Collections.emptySet();
        if (currentUserId != null) {
            List<UUID> commentIds = allComments.stream().map(PostComment::getId).toList();
            likedIds = new HashSet<>(commentLikeRepository.findLikedCommentIds(currentUserId, commentIds));
        }

        // Separate top-level comments and replies
        List<PostComment> topLevel = new ArrayList<>();
        Map<UUID, List<PostComment>> repliesByParent = new HashMap<>();
        for (PostComment c : allComments) {
            if (c.getParentId() == null) {
                topLevel.add(c);
            } else {
                repliesByParent.computeIfAbsent(c.getParentId(), k -> new ArrayList<>()).add(c);
            }
        }

        // Build response tree
        Set<UUID> finalLikedIds = likedIds;
        return topLevel.stream()
                .map(c -> {
                    List<CommentResponse> replies = repliesByParent.getOrDefault(c.getId(), List.of())
                            .stream()
                            .map(r -> toResponse(r, authors.get(r.getUserId()), finalLikedIds.contains(r.getId()), List.of()))
                            .toList();
                    return toResponse(c, authors.get(c.getUserId()), finalLikedIds.contains(c.getId()), replies);
                })
                .toList();
    }

    /**
     * Add a comment to a post. If parentId is set, it's a reply.
     * Enforces one-level depth: rejects replies-to-replies.
     */
    @Transactional
    public CommentResponse addComment(UUID userId, UUID postId, CreateCommentRequest request) {
        if (!postRepository.existsById(postId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
        }
        if (request.textContent() == null || request.textContent().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment text is required");
        }
        String text = request.textContent().trim();
        if (text.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comment text must be 500 characters or fewer");
        }

        // Enforce one-level reply depth
        if (request.parentId() != null) {
            PostComment parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent comment not found"));
            if (parent.getParentId() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot reply to a reply — only one level of nesting allowed");
            }
            // Parent must belong to the same post
            if (!parent.getPostId().equals(postId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent comment does not belong to this post");
            }
        }

        PostComment comment = PostComment.builder()
                .postId(postId)
                .userId(userId)
                .parentId(request.parentId())
                .textContent(text)
                .build();
        comment = commentRepository.save(comment);

        // Increment comment_count on the post (includes replies)
        dsl.update(DSL.table("posts"))
                .set(DSL.field("comment_count", Long.class), DSL.field("comment_count", Long.class).plus(1))
                .where(DSL.field("id", UUID.class).eq(postId))
                .execute();

        // Notify the appropriate recipient
        if (request.parentId() != null) {
            // Reply — notify the parent comment owner
            PostComment parent = commentRepository.findById(request.parentId()).orElse(null);
            if (parent != null) {
                eventPublisher.publishEvent(new NotificationEvent(
                        userId, parent.getUserId(), "reply_comment", comment.getId(), postId));
            }
        } else {
            // Top-level comment — notify the post owner
            UUID postOwnerId = dsl.select(DSL.field("user_id", UUID.class))
                    .from(DSL.table("posts"))
                    .where(DSL.field("id", UUID.class).eq(postId))
                    .fetchOne(DSL.field("user_id", UUID.class));
            if (postOwnerId != null) {
                eventPublisher.publishEvent(new NotificationEvent(
                        userId, postOwnerId, "comment_post", comment.getId(), postId));
            }
        }

        PostAuthorResponse author = fetchAuthor(userId);
        return toResponse(comment, author, false, List.of());
    }

    /**
     * Delete a comment. Owner only. Also deletes child replies (via FK cascade).
     * Decrements comment_count on the post by 1 + number of child replies.
     */
    @Transactional
    public void deleteComment(UUID userId, UUID commentId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));

        if (!comment.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your comment");
        }

        // Count child replies that will be cascade-deleted
        long replyCount = 0;
        if (comment.getParentId() == null) {
            // Top-level comment — count its replies
            replyCount = commentRepository.findByPostIdOrderByCreatedAtAsc(comment.getPostId())
                    .stream()
                    .filter(c -> commentId.equals(c.getParentId()))
                    .count();
        }

        commentRepository.delete(comment);

        // Decrement comment_count by 1 (this comment) + replyCount (cascaded replies)
        long decrementBy = 1 + replyCount;
        dsl.update(DSL.table("posts"))
                .set(DSL.field("comment_count", Long.class),
                        DSL.greatest(DSL.field("comment_count", Long.class).minus(decrementBy), DSL.val(0L)))
                .where(DSL.field("id", UUID.class).eq(comment.getPostId()))
                .execute();
    }

    // ========================================
    // COMMENT LIKES
    // ========================================

    @Transactional
    public void likeComment(UUID userId, UUID commentId) {
        if (!commentRepository.existsById(commentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found");
        }
        if (commentLikeRepository.existsByUserIdAndCommentId(userId, commentId)) {
            return; // Already liked — idempotent
        }

        commentLikeRepository.save(CommentLike.builder()
                .userId(userId)
                .commentId(commentId)
                .build());

        dsl.update(DSL.table("post_comments"))
                .set(DSL.field("like_count", Long.class), DSL.field("like_count", Long.class).plus(1))
                .where(DSL.field("id", UUID.class).eq(commentId))
                .execute();

        // Notify the comment owner
        PostComment comment = commentRepository.findById(commentId).orElse(null);
        if (comment != null) {
            eventPublisher.publishEvent(new NotificationEvent(
                    userId, comment.getUserId(), "like_comment", commentId, comment.getPostId()));
        }
    }

    @Transactional
    public void unlikeComment(UUID userId, UUID commentId) {
        if (!commentLikeRepository.existsByUserIdAndCommentId(userId, commentId)) {
            return; // Not liked — idempotent
        }

        commentLikeRepository.deleteByUserIdAndCommentId(userId, commentId);

        dsl.update(DSL.table("post_comments"))
                .set(DSL.field("like_count", Long.class),
                        DSL.greatest(DSL.field("like_count", Long.class).minus(1), DSL.val(0L)))
                .where(DSL.field("id", UUID.class).eq(commentId))
                .execute();

        // Remove the like notification
        notificationService.deleteNotification(userId, "like_comment", commentId);
    }

    // ========================================
    // HELPERS
    // ========================================

    private PostAuthorResponse fetchAuthor(UUID userId) {
        Record r = dsl.select(PROFILES.ID, PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL, PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOne();
        if (r == null) return null;
        return recordToAuthor(r);
    }

    /**
     * Batch-fetch author profiles for multiple user IDs.
     */
    private Map<UUID, PostAuthorResponse> batchFetchAuthors(List<UUID> userIds) {
        if (userIds.isEmpty()) return Map.of();
        return dsl.select(PROFILES.ID, PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL, PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.in(userIds))
                .fetch()
                .stream()
                .collect(Collectors.toMap(
                        r -> r.get(PROFILES.ID),
                        this::recordToAuthor
                ));
    }

    private PostAuthorResponse recordToAuthor(Record r) {
        var roles = r.get(PROFILES.ROLES);
        String[] roleStrings = roles != null
                ? Arrays.stream(roles).map(Enum::name).toArray(String[]::new)
                : new String[]{};
        return new PostAuthorResponse(
                r.get(PROFILES.ID),
                r.get(PROFILES.USERNAME),
                r.get(PROFILES.DISPLAY_NAME),
                r.get(PROFILES.AVATAR_URL),
                roleStrings
        );
    }

    private CommentResponse toResponse(PostComment comment, PostAuthorResponse author,
                                       boolean liked, List<CommentResponse> replies) {
        return new CommentResponse(
                comment.getId(),
                author,
                comment.getTextContent(),
                comment.getParentId(),
                comment.getLikeCount() != null ? comment.getLikeCount() : 0L,
                liked,
                replies,
                comment.getCreatedAt()
        );
    }
}
