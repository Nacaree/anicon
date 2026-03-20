package com.anicon.backend.search.dto;

import java.util.UUID;

/**
 * Search result for a user profile.
 * Lightweight subset of profile data for rendering in search dropdown and results page.
 */
public record UserResult(
    UUID id,
    String username,
    String displayName,
    String avatarUrl,
    String[] roles,
    long followerCount
) {}
