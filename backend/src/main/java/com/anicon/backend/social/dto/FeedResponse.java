package com.anicon.backend.social.dto;

import java.util.List;

/**
 * Paginated feed response with cursor-based pagination.
 * nextCursor is null when there are no more pages.
 */
public record FeedResponse(
    List<PostResponse> posts,
    String nextCursor
) {}
