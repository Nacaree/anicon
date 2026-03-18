package com.anicon.backend.notification;

import java.util.UUID;

/**
 * Lightweight Spring event published by services (PostService, CommentService, etc.)
 * when a notification-worthy action occurs. Handled asynchronously by NotificationEventHandler.
 */
public record NotificationEvent(
    UUID actorId,
    UUID recipientId,
    String type,        // e.g. "like_post", "comment_post", "follow_user"
    UUID targetId,
    UUID referenceId    // nullable — navigation context (e.g., post_id for comment notifications)
) {}
