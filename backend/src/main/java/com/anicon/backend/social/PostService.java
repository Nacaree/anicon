package com.anicon.backend.social;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.notification.NotificationEvent;
import com.anicon.backend.notification.NotificationService;

import com.anicon.backend.social.dto.*;

import static com.anicon.backend.gen.jooq.tables.PostTags.POST_TAGS;
import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;
import static com.anicon.backend.gen.jooq.tables.Tags.TAGS;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final PostImageRepository postImageRepository;
    private final PostLikeRepository postLikeRepository;
    private final DSLContext dsl;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationService notificationService;

    // Plain SQL field references — JOOQ types for posts tables don't exist yet
    // (tables haven't been generated). Same pattern as portfolio like_count updates.
    private static final Table<?> POSTS = DSL.table("posts");
    private static final Field<UUID> P_ID = DSL.field("posts.id", UUID.class);
    private static final Field<UUID> P_USER_ID = DSL.field("posts.user_id", UUID.class);
    private static final Field<String> P_TEXT = DSL.field("posts.text_content", String.class);
    private static final Field<UUID> P_ORIGINAL = DSL.field("posts.original_post_id", UUID.class);
    private static final Field<Long> P_LIKE_COUNT = DSL.field("posts.like_count", Long.class);
    private static final Field<Long> P_COMMENT_COUNT = DSL.field("posts.comment_count", Long.class);
    private static final Field<Long> P_REPOST_COUNT = DSL.field("posts.repost_count", Long.class);
    private static final Field<Boolean> P_IS_DELETED = DSL.field("posts.is_deleted", Boolean.class);
    private static final Field<OffsetDateTime> P_CREATED = DSL.field("posts.created_at", OffsetDateTime.class);
    private static final Field<OffsetDateTime> P_UPDATED = DSL.field("posts.updated_at", OffsetDateTime.class);

    // Regex to extract #hashtags from post text — matches word characters after #
    private static final Pattern HASHTAG_PATTERN = Pattern.compile("#(\\w+)");

    public PostService(PostRepository postRepository,
                       PostImageRepository postImageRepository,
                       PostLikeRepository postLikeRepository,
                       DSLContext dsl,
                       ApplicationEventPublisher eventPublisher,
                       NotificationService notificationService) {
        this.postRepository = postRepository;
        this.postImageRepository = postImageRepository;
        this.postLikeRepository = postLikeRepository;
        this.dsl = dsl;
        this.eventPublisher = eventPublisher;
        this.notificationService = notificationService;
    }

    // ========================================
    // HASHTAG SYNC — extract #tags from text and link via post_tags junction table
    // ========================================

    /**
     * Extracts #hashtags from post text, upserts them into the shared tags table,
     * and links them to the post via post_tags. Deletes old links first so edits
     * are handled correctly. Same upsert pattern as EventService.createEvent().
     */
    private void syncPostTags(UUID postId, String textContent) {
        // Clear old tag links for this post (safe for new posts — 0 rows deleted)
        dsl.deleteFrom(POST_TAGS).where(POST_TAGS.POST_ID.eq(postId)).execute();

        if (textContent == null) return;

        // Extract unique hashtags, normalized to lowercase
        Set<String> hashtags = new HashSet<>();
        Matcher matcher = HASHTAG_PATTERN.matcher(textContent);
        while (matcher.find()) {
            hashtags.add(matcher.group(1).toLowerCase());
        }

        // Upsert each tag and link to post
        for (String tagName : hashtags) {
            dsl.insertInto(TAGS)
                    .set(TAGS.NAME, tagName)
                    .onConflict(TAGS.NAME)
                    .doNothing()
                    .execute();

            UUID tagId = dsl.select(TAGS.ID)
                    .from(TAGS)
                    .where(TAGS.NAME.eq(tagName))
                    .fetchOne(TAGS.ID);

            dsl.insertInto(POST_TAGS)
                    .set(POST_TAGS.POST_ID, postId)
                    .set(POST_TAGS.TAG_ID, tagId)
                    .execute();
        }
    }

    // ========================================
    // CREATE
    // ========================================

    /**
     * Create a new original post with text and optional images (up to 10).
     * All roles can post — no role check needed.
     */
    @Transactional
    public PostResponse createPost(UUID userId, CreatePostRequest request) {
        // Posts can have text, images, or both — but at least one is required
        boolean hasText = request.textContent() != null && !request.textContent().isBlank();
        boolean hasImages = request.imageUrls() != null && !request.imageUrls().isEmpty();
        if (!hasText && !hasImages) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post must have text or at least one image");
        }
        String text = hasText ? request.textContent().trim() : null;
        if (text != null && text.length() > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post text must be 500 characters or fewer");
        }

        Post post = Post.builder()
                .userId(userId)
                .textContent(text)
                .build();
        // saveAndFlush ensures the post row is visible to JOOQ before inserting post_tags
        post = postRepository.saveAndFlush(post);

        // Extract #hashtags from text and store in post_tags junction table
        syncPostTags(post.getId(), text);

        // Save images (up to 10)
        List<PostImage> savedImages = new ArrayList<>();
        if (request.imageUrls() != null && !request.imageUrls().isEmpty()) {
            if (request.imageUrls().size() > 10) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum 10 images per post");
            }
            for (int i = 0; i < request.imageUrls().size(); i++) {
                PostImage image = PostImage.builder()
                        .postId(post.getId())
                        .imageUrl(request.imageUrls().get(i))
                        .displayOrder(i)
                        .build();
                savedImages.add(postImageRepository.save(image));
            }
        }

        PostAuthorResponse author = fetchAuthor(userId);
        return buildPostResponse(post, author, savedImages, null, false, false);
    }

    // ========================================
    // READ — single post
    // ========================================

    /**
     * Get a single post by ID with full details.
     * Used for the post detail page (/posts/[id]).
     */
    @Transactional(readOnly = true)
    public PostResponse getPost(UUID postId, UUID currentUserId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));

        if (post.getIsDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
        }

        PostAuthorResponse author = fetchAuthor(post.getUserId());
        List<PostImage> images = postImageRepository.findByPostIdOrderByDisplayOrderAsc(postId);

        boolean liked = currentUserId != null && postLikeRepository.existsByUserIdAndPostId(currentUserId, postId);
        boolean reposted = currentUserId != null && postRepository.existsByUserIdAndOriginalPostId(currentUserId, postId);

        // If it's a repost, fetch the original post data
        PostResponse originalPost = null;
        if (post.getOriginalPostId() != null) {
            originalPost = fetchOriginalPost(post.getOriginalPostId(), currentUserId);
        }

        return buildPostResponse(post, author, images, originalPost, liked, reposted);
    }

    // ========================================
    // READ — feed (public, cursor-paginated)
    // ========================================

    /**
     * Get the public feed — all non-deleted posts, newest first.
     * Uses cursor-based pagination: cursor = Base64(created_at|id).
     * Fetches limit+1 to determine if there are more pages.
     */
    @Transactional(readOnly = true)
    public FeedResponse getFeed(String cursor, int limit, UUID currentUserId) {
        return fetchFeedInternal(cursor, limit, currentUserId, null);
    }

    /**
     * Get a specific user's posts for the profile HomeTab.
     */
    @Transactional(readOnly = true)
    public FeedResponse getUserPosts(UUID userId, String cursor, int limit, UUID currentUserId) {
        return fetchFeedInternal(cursor, limit, currentUserId, userId);
    }

    /**
     * Internal feed query — shared between global feed and user feed.
     * filterUserId is null for global feed, set for user-specific feed.
     */
    private FeedResponse fetchFeedInternal(String cursor, int limit, UUID currentUserId, UUID filterUserId) {
        if (limit <= 0 || limit > 50) limit = 20;

        // Build cursor condition
        Condition cursorCondition = DSL.noCondition();
        if (cursor != null && !cursor.isBlank()) {
            CursorData cd = decodeCursor(cursor);
            if (cd != null) {
                // (created_at, id) < (cursorTime, cursorId) for descending order
                cursorCondition = DSL.row(P_CREATED, P_ID)
                        .lessThan(DSL.row(DSL.val(cd.createdAt), DSL.val(cd.id)));
            }
        }

        // Build filter condition
        Condition filterCondition = P_IS_DELETED.isFalse();
        if (filterUserId != null) {
            filterCondition = filterCondition.and(P_USER_ID.eq(filterUserId));
        }

        // Fetch posts + author profile data in one query.
        // PROFILES.ID is included so recordToAuthor() can read the author UUID.
        var resultSet = dsl.select(
                        P_ID, P_USER_ID, P_TEXT, P_ORIGINAL,
                        P_LIKE_COUNT, P_COMMENT_COUNT, P_REPOST_COUNT,
                        P_CREATED, P_UPDATED,
                        PROFILES.ID, PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL, PROFILES.ROLES
                )
                .from(POSTS)
                .join(PROFILES).on(P_USER_ID.eq(PROFILES.ID))
                .where(filterCondition)
                .and(cursorCondition)
                .orderBy(P_CREATED.desc(), P_ID.desc())
                .limit(limit + 1)
                .fetch();
        List<Record> records = new ArrayList<>(resultSet);

        boolean hasMore = records.size() > limit;
        if (hasMore) {
            records = records.subList(0, limit);
        }

        if (records.isEmpty()) {
            return new FeedResponse(List.of(), null);
        }

        // Collect post IDs for batch lookups
        List<UUID> postIds = records.stream().map(r -> r.get(P_ID)).toList();

        // Batch-fetch images for all posts
        Map<UUID, List<PostImageResponse>> imagesByPost = batchFetchImages(postIds);

        // Batch-fetch liked and reposted status for current user
        Set<UUID> likedIds = Collections.emptySet();
        Set<UUID> repostedOriginalIds = Collections.emptySet();
        if (currentUserId != null) {
            likedIds = new HashSet<>(postLikeRepository.findLikedPostIds(currentUserId, postIds));

            // For repost status, we need to check which original_post_ids the user has reposted
            List<UUID> originalIds = records.stream()
                    .map(r -> r.get(P_ORIGINAL))
                    .filter(Objects::nonNull)
                    .distinct()
                    .toList();
            // Also check if the user has reposted any of the posts in the feed
            repostedOriginalIds = batchFetchRepostedIds(currentUserId, postIds);
        }

        // Batch-fetch original posts for reposts
        List<UUID> originalPostIds = records.stream()
                .map(r -> r.get(P_ORIGINAL))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, PostResponse> originalPosts = batchFetchOriginalPosts(originalPostIds, currentUserId);

        // Build response list
        List<PostResponse> postResponses = new ArrayList<>();
        for (Record r : records) {
            UUID postId = r.get(P_ID);
            PostAuthorResponse author = recordToAuthor(r);
            List<PostImageResponse> images = imagesByPost.getOrDefault(postId, List.of());

            UUID originalId = r.get(P_ORIGINAL);
            PostResponse originalPost = originalId != null ? originalPosts.get(originalId) : null;

            boolean liked = likedIds.contains(postId);
            // A post is "reposted by current user" if the user has a repost row pointing to this post
            boolean reposted = repostedOriginalIds.contains(postId);

            boolean isEdited = isEdited(r.get(P_CREATED), r.get(P_UPDATED));

            postResponses.add(new PostResponse(
                    postId,
                    author,
                    r.get(P_TEXT),
                    images,
                    originalPost,
                    r.get(P_LIKE_COUNT) != null ? r.get(P_LIKE_COUNT) : 0L,
                    r.get(P_COMMENT_COUNT) != null ? r.get(P_COMMENT_COUNT) : 0L,
                    r.get(P_REPOST_COUNT) != null ? r.get(P_REPOST_COUNT) : 0L,
                    liked,
                    reposted,
                    isEdited,
                    r.get(P_CREATED)
            ));
        }

        // Build next cursor from last item
        String nextCursor = null;
        if (hasMore) {
            Record last = records.get(records.size() - 1);
            nextCursor = encodeCursor(last.get(P_CREATED), last.get(P_ID));
        }

        return new FeedResponse(postResponses, nextCursor);
    }

    // ========================================
    // UPDATE
    // ========================================

    /**
     * Edit post text and/or images. Only the owner can edit, and only original posts (not reposts).
     * If imageUrls is provided, replaces all existing images with the new set.
     */
    @Transactional
    public PostResponse updatePost(UUID userId, UUID postId, UpdatePostRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));

        if (!post.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your post");
        }
        if (post.getOriginalPostId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot edit a repost");
        }

        // Update text if provided
        if (request.textContent() != null && !request.textContent().isBlank()) {
            String text = request.textContent().trim();
            if (text.length() > 500) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Post text must be 500 characters or fewer");
            }
            post.setTextContent(text);
        }

        // Update images if provided — replace all existing images with the new set
        if (request.imageUrls() != null) {
            List<PostImage> existing = postImageRepository.findByPostIdOrderByDisplayOrderAsc(postId);
            postImageRepository.deleteAll(existing);

            for (int i = 0; i < request.imageUrls().size() && i < 10; i++) {
                String url = request.imageUrls().get(i);
                if (url != null && !url.isBlank()) {
                    postImageRepository.save(PostImage.builder()
                            .postId(postId)
                            .imageUrl(url)
                            .displayOrder(i)
                            .build());
                }
            }
        }

        // saveAndFlush ensures the post row is visible to JOOQ before syncing post_tags
        post = postRepository.saveAndFlush(post);

        // Re-extract #hashtags from updated text and sync post_tags
        syncPostTags(postId, post.getTextContent());

        return getPost(postId, userId);
    }

    // ========================================
    // DELETE
    // ========================================

    /**
     * Delete a post. Only the owner can delete.
     * For original posts: cascades to images, likes, comments via FK.
     * For reposts: also decrements repost_count on the original.
     */
    @Transactional
    public void deletePost(UUID userId, UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));

        if (!post.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your post");
        }

        // If this is a repost, decrement repost_count on the original
        if (post.getOriginalPostId() != null) {
            decrementCount("posts", "repost_count", "id", post.getOriginalPostId());
        }

        postRepository.delete(post);
    }

    // ========================================
    // LIKE / UNLIKE
    // ========================================

    /**
     * Like a post. Idempotent — liking twice is a no-op.
     * Atomically increments the denormalized like_count.
     */
    @Transactional
    public void likePost(UUID userId, UUID postId) {
        if (!postRepository.existsById(postId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found");
        }
        if (postLikeRepository.existsByUserIdAndPostId(userId, postId)) {
            return; // Already liked — idempotent
        }

        postLikeRepository.save(PostLike.builder()
                .userId(userId)
                .postId(postId)
                .build());

        incrementCount("posts", "like_count", "id", postId);

        // Notify the post owner that someone liked their post
        UUID postOwnerId = dsl.select(P_USER_ID).from(POSTS).where(P_ID.eq(postId)).fetchOne(P_USER_ID);
        if (postOwnerId != null) {
            eventPublisher.publishEvent(new NotificationEvent(userId, postOwnerId, "like_post", postId, null));
        }
    }

    /**
     * Unlike a post. Idempotent — unliking when not liked is a no-op.
     */
    @Transactional
    public void unlikePost(UUID userId, UUID postId) {
        if (!postLikeRepository.existsByUserIdAndPostId(userId, postId)) {
            return; // Not liked — idempotent
        }

        postLikeRepository.deleteByUserIdAndPostId(userId, postId);

        decrementCount("posts", "like_count", "id", postId);

        // Remove the like notification
        notificationService.deleteNotification(userId, "like_post", postId);
    }

    // ========================================
    // REPOST / UNDO REPOST
    // ========================================

    /**
     * Repost a post. Creates a new posts row with original_post_id set.
     * Cannot repost your own post or repost the same post twice.
     */
    @Transactional
    public PostResponse repost(UUID userId, UUID originalPostId) {
        Post original = postRepository.findById(originalPostId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));

        if (original.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot repost your own post");
        }
        if (original.getOriginalPostId() != null) {
            // Don't allow reposting a repost — repost the original instead
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot repost a repost");
        }
        if (postRepository.existsByUserIdAndOriginalPostId(userId, originalPostId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already reposted");
        }

        // Create the repost row (text_content is null for plain reposts)
        Post repost = Post.builder()
                .userId(userId)
                .originalPostId(originalPostId)
                .build();
        repost = postRepository.save(repost);

        // Increment repost_count on the original
        incrementCount("posts", "repost_count", "id", originalPostId);

        // Notify the original post owner
        eventPublisher.publishEvent(new NotificationEvent(userId, original.getUserId(), "repost_post", originalPostId, null));

        return getPost(repost.getId(), userId);
    }

    /**
     * Undo a repost. Finds and deletes the user's repost of the original post.
     * Decrements repost_count on the original.
     */
    @Transactional
    public void undoRepost(UUID userId, UUID originalPostId) {
        Post repost = postRepository.findByUserIdAndOriginalPostId(userId, originalPostId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repost not found"));

        postRepository.delete(repost);

        decrementCount("posts", "repost_count", "id", originalPostId);

        // Remove the repost notification
        notificationService.deleteNotification(userId, "repost_post", originalPostId);
    }

    // ========================================
    // HELPERS
    // ========================================

    /**
     * Fetch author profile data for a single user.
     */
    private PostAuthorResponse fetchAuthor(UUID userId) {
        Record r = dsl.select(PROFILES.ID, PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL, PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOne();
        if (r == null) return null;
        return recordToAuthor(r);
    }

    /**
     * Convert a JOOQ record (containing profile fields) to PostAuthorResponse.
     */
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

    /**
     * Batch-fetch images for multiple posts. Returns a map of postId → images.
     */
    private Map<UUID, List<PostImageResponse>> batchFetchImages(List<UUID> postIds) {
        if (postIds.isEmpty()) return Map.of();
        List<PostImage> allImages = postImageRepository.findByPostIdInOrderByPostIdAscDisplayOrderAsc(postIds);
        return allImages.stream()
                .map(img -> new AbstractMap.SimpleEntry<>(img.getPostId(),
                        new PostImageResponse(img.getId(), img.getImageUrl(), img.getDisplayOrder())))
                .collect(Collectors.groupingBy(
                        Map.Entry::getKey,
                        Collectors.mapping(Map.Entry::getValue, Collectors.toList())
                ));
    }

    /**
     * Batch-fetch which of the given post IDs the current user has reposted.
     * Returns the set of original_post_ids that the user has repost rows for.
     */
    private Set<UUID> batchFetchRepostedIds(UUID currentUserId, List<UUID> postIds) {
        if (postIds.isEmpty()) return Set.of();
        return new HashSet<>(dsl.select(DSL.field("original_post_id", UUID.class))
                .from(POSTS)
                .where(P_USER_ID.eq(currentUserId))
                .and(DSL.field("original_post_id", UUID.class).in(postIds))
                .and(P_IS_DELETED.isFalse())
                .fetch(DSL.field("original_post_id", UUID.class)));
    }

    /**
     * Batch-fetch original posts for reposts in the feed.
     * Returns a map of originalPostId → PostResponse.
     */
    private Map<UUID, PostResponse> batchFetchOriginalPosts(List<UUID> originalPostIds, UUID currentUserId) {
        if (originalPostIds.isEmpty()) return Map.of();

        List<Record> records = new ArrayList<>(dsl.select(
                        P_ID, P_USER_ID, P_TEXT, P_ORIGINAL,
                        P_LIKE_COUNT, P_COMMENT_COUNT, P_REPOST_COUNT,
                        P_CREATED, P_UPDATED,
                        PROFILES.ID, PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL, PROFILES.ROLES
                )
                .from(POSTS)
                .join(PROFILES).on(P_USER_ID.eq(PROFILES.ID))
                .where(P_ID.in(originalPostIds))
                .fetch());

        Map<UUID, List<PostImageResponse>> imagesByPost = batchFetchImages(originalPostIds);

        Set<UUID> likedIds = Collections.emptySet();
        Set<UUID> repostedIds = Collections.emptySet();
        if (currentUserId != null) {
            likedIds = new HashSet<>(postLikeRepository.findLikedPostIds(currentUserId, originalPostIds));
            repostedIds = batchFetchRepostedIds(currentUserId, originalPostIds);
        }

        Map<UUID, PostResponse> result = new HashMap<>();
        for (Record r : records) {
            UUID id = r.get(P_ID);
            result.put(id, new PostResponse(
                    id,
                    recordToAuthor(r),
                    r.get(P_TEXT),
                    imagesByPost.getOrDefault(id, List.of()),
                    null, // original posts don't have nested originals
                    r.get(P_LIKE_COUNT) != null ? r.get(P_LIKE_COUNT) : 0L,
                    r.get(P_COMMENT_COUNT) != null ? r.get(P_COMMENT_COUNT) : 0L,
                    r.get(P_REPOST_COUNT) != null ? r.get(P_REPOST_COUNT) : 0L,
                    likedIds.contains(id),
                    repostedIds.contains(id),
                    isEdited(r.get(P_CREATED), r.get(P_UPDATED)),
                    r.get(P_CREATED)
            ));
        }
        return result;
    }

    /**
     * Fetch original post data for a single repost.
     * Returns null if the original was deleted (ON DELETE SET NULL leaves orphan reposts).
     */
    private PostResponse fetchOriginalPost(UUID originalPostId, UUID currentUserId) {
        Post original = postRepository.findById(originalPostId).orElse(null);
        if (original == null || original.getIsDeleted()) return null;

        PostAuthorResponse author = fetchAuthor(original.getUserId());
        List<PostImage> images = postImageRepository.findByPostIdOrderByDisplayOrderAsc(originalPostId);

        boolean liked = currentUserId != null && postLikeRepository.existsByUserIdAndPostId(currentUserId, originalPostId);
        boolean reposted = currentUserId != null && postRepository.existsByUserIdAndOriginalPostId(currentUserId, originalPostId);

        return buildPostResponse(original, author, images, null, liked, reposted);
    }

    /**
     * Build a PostResponse from entity data.
     */
    private PostResponse buildPostResponse(Post post, PostAuthorResponse author,
                                           List<PostImage> images, PostResponse originalPost,
                                           boolean liked, boolean reposted) {
        List<PostImageResponse> imageResponses = images.stream()
                .map(img -> new PostImageResponse(img.getId(), img.getImageUrl(), img.getDisplayOrder()))
                .toList();

        return new PostResponse(
                post.getId(),
                author,
                post.getTextContent(),
                imageResponses,
                originalPost,
                post.getLikeCount() != null ? post.getLikeCount() : 0L,
                post.getCommentCount() != null ? post.getCommentCount() : 0L,
                post.getRepostCount() != null ? post.getRepostCount() : 0L,
                liked,
                reposted,
                isEdited(post.getCreatedAt(), post.getUpdatedAt()),
                post.getCreatedAt()
        );
    }

    /**
     * Check if a post has been edited — updated_at > created_at + 1 second
     * (small delta accounts for DB trigger timing on initial insert).
     */
    private boolean isEdited(OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        if (createdAt == null || updatedAt == null) return false;
        return updatedAt.isAfter(createdAt.plusSeconds(1));
    }

    // ========================================
    // ATOMIC COUNTER HELPERS
    // ========================================

    /**
     * Atomically increment a denormalized counter column by 1.
     */
    private void incrementCount(String tableName, String columnName, String idColumn, UUID id) {
        dsl.update(DSL.table(tableName))
                .set(DSL.field(columnName, Long.class), DSL.field(columnName, Long.class).plus(1))
                .where(DSL.field(idColumn, UUID.class).eq(id))
                .execute();
    }

    /**
     * Atomically decrement a denormalized counter column by 1, floored at 0.
     */
    private void decrementCount(String tableName, String columnName, String idColumn, UUID id) {
        dsl.update(DSL.table(tableName))
                .set(DSL.field(columnName, Long.class),
                        DSL.greatest(DSL.field(columnName, Long.class).minus(1), DSL.val(0L)))
                .where(DSL.field(idColumn, UUID.class).eq(id))
                .execute();
    }

    // ========================================
    // CURSOR ENCODING/DECODING
    // ========================================

    /**
     * Encode a cursor from created_at and id.
     * Format: Base64(ISO_TIMESTAMP|UUID)
     */
    private String encodeCursor(OffsetDateTime createdAt, UUID id) {
        String raw = createdAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME) + "|" + id.toString();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Decode a cursor string into its timestamp and id components.
     * Returns null if the cursor is invalid.
     */
    private CursorData decodeCursor(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", 2);
            if (parts.length != 2) return null;
            OffsetDateTime ts = OffsetDateTime.parse(parts[0], DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            UUID id = UUID.fromString(parts[1]);
            return new CursorData(ts, id);
        } catch (Exception e) {
            return null; // Invalid cursor — treat as no cursor (start from beginning)
        }
    }

    private record CursorData(OffsetDateTime createdAt, UUID id) {}
}
