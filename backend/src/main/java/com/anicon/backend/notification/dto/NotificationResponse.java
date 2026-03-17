package com.anicon.backend.notification.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Single notification item returned to the frontend.
 * Includes actor profile info for rendering avatar/name.
 * actorCount > 1 means aggregation: "X and N others liked your post".
 */
public record NotificationResponse(
    UUID id,
    String type,
    UUID targetId,
    UUID referenceId,
    // Actor info (most recent actor for aggregated notifications)
    UUID actorId,
    String actorUsername,
    String actorDisplayName,
    String actorAvatarUrl,
    int actorCount,         // 1 = single actor, >1 = "and N others"
    boolean isRead,
    OffsetDateTime createdAt
) {}
