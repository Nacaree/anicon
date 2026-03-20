package com.anicon.backend.search.dto;

import java.util.List;

/**
 * Top-level search response containing results from all three content types.
 * Lists are empty (not null) when a type is excluded via the "type" query param.
 */
public record SearchResponse(
    List<UserResult> users,
    List<EventResult> events,
    List<PostResult> posts
) {}
