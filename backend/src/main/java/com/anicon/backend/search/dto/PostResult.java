package com.anicon.backend.search.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.anicon.backend.social.dto.PostAuthorResponse;

/**
 * Search result for a post.
 * Reuses PostAuthorResponse for author info — no need to duplicate that DTO.
 * Only includes the first image URL to keep the result lightweight.
 */
public record PostResult(
    UUID id,
    PostAuthorResponse author,
    String textContent,
    String firstImageUrl,
    long likeCount,
    long commentCount,
    long repostCount,
    boolean likedByCurrentUser,
    OffsetDateTime createdAt
) {}
