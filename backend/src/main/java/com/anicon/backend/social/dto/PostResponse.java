package com.anicon.backend.social.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full post response for feed items and post detail.
 * For reposts, originalPost is populated with the referenced post's data.
 * For original posts, originalPost is null.
 */
public record PostResponse(
    UUID id,
    PostAuthorResponse author,
    String textContent,
    List<PostImageResponse> images,
    PostResponse originalPost,
    long likeCount,
    long commentCount,
    long repostCount,
    boolean likedByCurrentUser,
    boolean repostedByCurrentUser,
    boolean isEdited,
    OffsetDateTime createdAt
) {}
