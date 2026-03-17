package com.anicon.backend.notification;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Persistent notification for social interactions (likes, comments, follows, reposts).
 * UNIQUE(actor_id, type, target_id) prevents duplicates on like→unlike→like cycles.
 */
@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    // Notification type: like_post, comment_post, reply_comment, like_comment,
    // repost_post, like_portfolio, follow_user
    @Column(name = "type", nullable = false, length = 30)
    private String type;

    // The entity this notification is about (post, comment, portfolio item, or user)
    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    // Navigation context (e.g., post_id for comment/reply notifications)
    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
