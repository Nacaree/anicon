package com.anicon.backend.social.dto;

import java.util.UUID;

/**
 * Request body for adding a comment to a post.
 * parentId is null for top-level comments, set for replies.
 * Replies-to-replies are rejected at the service layer.
 */
public record CreateCommentRequest(
    String textContent,
    UUID parentId
) {}
