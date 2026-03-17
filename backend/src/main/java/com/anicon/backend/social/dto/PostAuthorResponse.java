package com.anicon.backend.social.dto;

import java.util.UUID;

/**
 * Lightweight author info embedded in PostResponse and CommentResponse.
 * Avoids returning the full profile for every post in the feed.
 */
public record PostAuthorResponse(
    UUID id,
    String username,
    String displayName,
    String avatarUrl,
    String[] roles
) {}
