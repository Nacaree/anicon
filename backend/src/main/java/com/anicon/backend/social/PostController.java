package com.anicon.backend.social;

import java.util.Objects;
import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.social.dto.*;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    // Feed data is user-specific and real-time — must never be served from browser cache.
    // Without this, browsers heuristically cache GET responses and serve stale feeds on refresh.
    private static final CacheControl NO_CACHE = CacheControl.noStore();

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    /**
     * Create a new post. Requires authentication. All roles can post.
     */
    @PostMapping
    public ResponseEntity<PostResponse> createPost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody CreatePostRequest request) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.createPost(userId, request));
    }

    /**
     * Get the public feed — all posts, newest first, cursor-paginated.
     * Optionally authenticated: if token is present, populates liked/reposted state.
     */
    @GetMapping("/feed")
    public ResponseEntity<FeedResponse> getFeed(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok()
                .cacheControl(NO_CACHE)
                .body(postService.getFeed(cursor, limit, currentUserId));
    }

    /**
     * Get a user's posts for their profile HomeTab, cursor-paginated.
     * Optionally authenticated for liked/reposted state.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<FeedResponse> getUserPosts(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID userId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok()
                .cacheControl(NO_CACHE)
                .body(postService.getUserPosts(userId, cursor, limit, currentUserId));
    }

    /**
     * Get a single post by ID. For the post detail page (/posts/[id]).
     * Optionally authenticated for liked/reposted state.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(postService.getPost(id, currentUserId));
    }

    /**
     * Edit a post's text. Owner only. Reposts cannot be edited.
     */
    @PatchMapping("/{id}")
    public ResponseEntity<PostResponse> updatePost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody UpdatePostRequest request) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        return ResponseEntity.ok(postService.updatePost(userId, id, request));
    }

    /**
     * Delete a post. Owner only.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        postService.deletePost(userId, id);
        return ResponseEntity.noContent().build();
    }

    // ========================================
    // LIKE / UNLIKE
    // ========================================

    @PostMapping("/{id}/like")
    public ResponseEntity<Void> likePost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        postService.likePost(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<Void> unlikePost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        postService.unlikePost(userId, id);
        return ResponseEntity.noContent().build();
    }

    // ========================================
    // REPOST / UNDO REPOST
    // ========================================

    /**
     * Repost a post. Creates a new post row referencing the original.
     * Cannot repost your own post or a repost.
     */
    @PostMapping("/{id}/repost")
    public ResponseEntity<PostResponse> repost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(postService.repost(userId, id));
    }

    /**
     * Undo a repost. Deletes the user's repost of the original post.
     */
    @DeleteMapping("/{id}/repost")
    public ResponseEntity<Void> undoRepost(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = Objects.requireNonNull(principal.getUserId());
        postService.undoRepost(userId, id);
        return ResponseEntity.noContent().build();
    }
}
