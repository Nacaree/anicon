package com.anicon.backend.notification;

import com.anicon.backend.notification.dto.NotificationResponse;
import com.anicon.backend.notification.dto.UnreadCountResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST endpoints for the notification system.
 * All endpoints require authentication — userId comes from the JWT.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Get recent notifications (aggregated by type + target).
     * Used by the notification dropdown.
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        UUID userId = principal.getUserId();
        return ResponseEntity.ok(notificationService.getNotifications(userId, limit, offset));
    }

    /**
     * Get unread notification count.
     * Polled every 30s by the frontend for the bell icon badge.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {
        UUID userId = principal.getUserId();
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    /**
     * Mark a single notification (and its group) as read.
     * Called when the user clicks a notification in the dropdown.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        UUID userId = principal.getUserId();
        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok().build();
    }

    /**
     * Mark all notifications as read.
     * Called when the user clicks "Mark all read" in the dropdown.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {
        UUID userId = principal.getUserId();
        notificationService.markAllRead(userId);
        return ResponseEntity.ok().build();
    }
}
