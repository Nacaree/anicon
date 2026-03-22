package com.anicon.backend.feed.dto;

import java.util.List;

/**
 * Response for the unified feed endpoint (GET /api/feed).
 * Contains a mixed list of posts and scraped events, sorted by created_at DESC.
 * nextCursor is null when there are no more pages.
 */
public record UnifiedFeedResponse(
    List<FeedItemResponse> items,
    String nextCursor
) {}
