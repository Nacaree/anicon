package com.anicon.backend.feed;

import com.anicon.backend.feed.dto.UnifiedFeedResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Unified feed endpoint that returns posts and scraped events interleaved
 * by created_at DESC. Replaces postsApi.getFeed() on the homepage while
 * profile pages continue using PostController.getUserPosts().
 */
@RestController
@RequestMapping("/api/feed")
public class FeedController {

    private final FeedService feedService;

    public FeedController(FeedService feedService) {
        this.feedService = feedService;
    }

    /**
     * Get the unified feed — posts + scraped events, newest first, cursor-paginated.
     * Optionally authenticated: if token is present, populates liked/reposted state on posts.
     */
    @GetMapping
    public ResponseEntity<UnifiedFeedResponse> getFeed(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(feedService.getFeed(cursor, limit, currentUserId));
    }
}
