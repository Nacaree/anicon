package com.anicon.backend.notification;

import java.time.OffsetDateTime;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.anicon.backend.notification.dto.NotificationResponse;

import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

/**
 * Listens for NotificationEvent published by social services (PostService, etc.)
 * and creates notification records asynchronously after the originating transaction commits.
 * After persisting, pushes the notification in real-time via STOMP WebSocket.
 */
@Component
public class NotificationEventHandler {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventHandler.class);

    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final DSLContext dsl;

    public NotificationEventHandler(NotificationService notificationService,
                                     SimpMessagingTemplate messagingTemplate,
                                     DSLContext dsl) {
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
        this.dsl = dsl;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(NotificationEvent event) {
        // Don't notify yourself
        if (event.actorId().equals(event.recipientId())) return;

        try {
            // 1. Persist the notification to the database
            notificationService.createNotification(event);

            // 2. Push to the recipient via WebSocket (if connected)
            Record actor = dsl.select(PROFILES.ID, PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL)
                    .from(PROFILES)
                    .where(PROFILES.ID.eq(event.actorId()))
                    .fetchOne();

            if (actor != null) {
                NotificationResponse response = new NotificationResponse(
                        null, // ID not critical for real-time push
                        event.type(),
                        event.targetId(),
                        event.referenceId(),
                        actor.get(PROFILES.ID),
                        actor.get(PROFILES.USERNAME),
                        actor.get(PROFILES.DISPLAY_NAME),
                        actor.get(PROFILES.AVATAR_URL),
                        1, // Single actor for real-time push
                        false, // New notification is always unread
                        OffsetDateTime.now()
                );

                // convertAndSendToUser matches the Principal.getName() set in WebSocketAuthInterceptor
                messagingTemplate.convertAndSendToUser(
                        event.recipientId().toString(),
                        "/queue/notifications",
                        response
                );
            }
        } catch (Exception e) {
            // Non-critical — log and swallow so a failed notification never breaks the main flow
            log.warn("Failed to create/push notification: type={}, actor={}, recipient={} — {}",
                    event.type(), event.actorId(), event.recipientId(), e.getMessage());
        }
    }
}
