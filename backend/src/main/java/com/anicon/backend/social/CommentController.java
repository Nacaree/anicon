package com.anicon.backend.social;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.social.dto.CommentResponse;
import com.anicon.backend.social.dto.CreateCommentRequest;

@RestController
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    /**
     * Get all comments for a post, structured as top-level comments with nested replies.
     * Optionally authenticated for liked state.
     */
    @GetMapping("/api/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID postId) {
        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(commentService.getComments(postId, currentUserId));
    }

    /**
     * Add a comment or reply to a post. Requires authentication.
     * Set parentId to reply to an existing comment (one level only).
     */
    @PostMapping("/api/posts/{postId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID postId,
            @RequestBody CreateCommentRequest request) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment(userId, postId, request));
    }

    /**
     * Delete a comment. Owner only. Child replies are cascade-deleted.
     */
    @DeleteMapping("/api/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID commentId) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        commentService.deleteComment(userId, commentId);
        return ResponseEntity.noContent().build();
    }

    // ========================================
    // COMMENT LIKES
    // ========================================

    @PostMapping("/api/comments/{id}/like")
    public ResponseEntity<Void> likeComment(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        commentService.likeComment(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/comments/{id}/like")
    public ResponseEntity<Void> unlikeComment(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        commentService.unlikeComment(userId, id);
        return ResponseEntity.noContent().build();
    }
}
