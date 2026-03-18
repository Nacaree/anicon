package com.anicon.backend.social.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Comment response with optional nested replies.
 * Top-level comments have replies populated; replies themselves have an empty replies list.
 */
public record CommentResponse(
    UUID id,
    PostAuthorResponse author,
    String textContent,
    UUID parentId,
    long likeCount,
    boolean likedByCurrentUser,
    List<CommentResponse> replies,
    OffsetDateTime createdAt
) {}
