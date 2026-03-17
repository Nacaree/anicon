package com.anicon.backend.notification;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    // Count unread notifications for the polling badge
    long countByRecipientIdAndIsReadFalse(UUID recipientId);

    // Fetch recent notifications for the dropdown, newest first
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

    // Mark all unread notifications as read for a user
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipientId = :recipientId AND n.isRead = false")
    int markAllRead(@Param("recipientId") UUID recipientId);

    // Find existing notification for upsert (like→unlike→like dedup)
    Optional<Notification> findByActorIdAndTypeAndTargetId(UUID actorId, String type, UUID targetId);

    // Delete notification when action is undone (unlike, unfollow)
    void deleteByActorIdAndTypeAndTargetId(UUID actorId, String type, UUID targetId);
}
