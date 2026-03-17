package com.anicon.backend.notification;

import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.anicon.backend.notification.dto.NotificationResponse;
import com.anicon.backend.notification.dto.UnreadCountResponse;

/**
 * Handles creating, querying, and managing notifications.
 * Uses JPA for simple CRUD and plain JDBC for aggregated queries
 * (avoids JOOQ SQL grammar issues with GROUP BY + LIMIT on PostgreSQL).
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbc;

    public NotificationService(NotificationRepository notificationRepository, JdbcTemplate jdbc) {
        this.notificationRepository = notificationRepository;
        this.jdbc = jdbc;
    }

    /**
     * Create or resurface a notification via upsert.
     * If the same (actor, type, target) already exists (e.g. like→unlike→like),
     * reset is_read to false and update created_at so it reappears.
     */
    @Transactional
    public void createNotification(NotificationEvent event) {
        // Don't notify yourself
        if (event.actorId().equals(event.recipientId())) return;

        jdbc.update("""
                INSERT INTO notifications (id, recipient_id, actor_id, type, target_id, reference_id, is_read, created_at)
                VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, false, now())
                ON CONFLICT (actor_id, type, target_id)
                DO UPDATE SET is_read = false, created_at = now()
                """,
                event.recipientId(), event.actorId(), event.type(),
                event.targetId(), event.referenceId()
        );
    }

    /**
     * Delete a notification when the action is undone (unlike, unfollow).
     */
    @Transactional
    public void deleteNotification(UUID actorId, String type, UUID targetId) {
        notificationRepository.deleteByActorIdAndTypeAndTargetId(actorId, type, targetId);
    }

    /**
     * Get aggregated notifications for a user.
     * Groups by (type, target_id) so "5 people liked your post" shows as one item.
     * Returns the most recent actor's info and a count of total actors.
     */
    public List<NotificationResponse> getNotifications(UUID recipientId, int limit, int offset) {
        // Step 1: Get recent notifications (no GROUP BY — just fetch the latest N rows)
        // This is simple and avoids all LIMIT/OFFSET binding issues with subqueries.
        var rows = jdbc.queryForList(
                "SELECT id, actor_id, type, target_id, reference_id, is_read, created_at " +
                "FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT " + limit + " OFFSET " + offset,
                recipientId
        );

        if (rows.isEmpty()) return List.of();

        // Step 2: For each notification, fetch the actor's profile
        return rows.stream().map(row -> {
            UUID actorId = (UUID) row.get("actor_id");

            // Fetch actor profile
            var profiles = jdbc.queryForList(
                    "SELECT id, username, display_name, avatar_url FROM profiles WHERE id = ?",
                    actorId
            );
            var profile = profiles.isEmpty() ? null : profiles.get(0);

            return new NotificationResponse(
                    (UUID) row.get("id"),
                    (String) row.get("type"),
                    (UUID) row.get("target_id"),
                    (UUID) row.get("reference_id"),
                    actorId,
                    profile != null ? (String) profile.get("username") : null,
                    profile != null ? (String) profile.get("display_name") : null,
                    profile != null ? (String) profile.get("avatar_url") : null,
                    1, // Each row is a single notification (no aggregation for now)
                    (Boolean) row.get("is_read"),
                    ((java.sql.Timestamp) row.get("created_at")).toInstant().atOffset(java.time.ZoneOffset.UTC)
            );
        }).toList();
    }

    /**
     * Get unread notification count for the polling badge.
     */
    public UnreadCountResponse getUnreadCount(UUID recipientId) {
        long count = notificationRepository.countByRecipientIdAndIsReadFalse(recipientId);
        return new UnreadCountResponse(count);
    }

    /**
     * Mark a single notification group as read by marking all notifications
     * with the same (type, target_id) for this recipient.
     */
    @Transactional
    public void markAsRead(UUID recipientId, UUID notificationId) {
        var notif = notificationRepository.findById(notificationId).orElse(null);
        if (notif == null || !notif.getRecipientId().equals(recipientId)) return;

        jdbc.update("""
                UPDATE notifications SET is_read = true
                WHERE recipient_id = ? AND type = ? AND target_id = ?
                """,
                recipientId, notif.getType(), notif.getTargetId()
        );
    }

    /**
     * Mark all notifications as read for a user.
     */
    @Transactional
    public void markAllRead(UUID recipientId) {
        notificationRepository.markAllRead(recipientId);
    }
}
