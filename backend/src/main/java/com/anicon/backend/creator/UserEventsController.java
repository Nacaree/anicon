package com.anicon.backend.creator;

import com.anicon.backend.creator.dto.UserEventResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Public endpoints for profile event tabs.
 * Returns events a user is going to (RSVP + tickets) or has hosted.
 */
@RestController
@RequestMapping("/api/users")
public class UserEventsController {

    private final UserEventsService userEventsService;

    public UserEventsController(UserEventsService userEventsService) {
        this.userEventsService = userEventsService;
    }

    /**
     * Get events the user is going to (RSVP'd or bought tickets).
     * Public endpoint — anyone can view.
     */
    @GetMapping("/{userId}/events/going")
    public ResponseEntity<List<UserEventResponse>> getGoingEvents(@PathVariable UUID userId) {
        return ResponseEntity.ok(userEventsService.getGoingEvents(userId));
    }

    /**
     * Get events the user has hosted/organized.
     * Public endpoint — anyone can view.
     *
     * @param miniOnly If true, only return mini-events (useful for influencer profiles)
     */
    @GetMapping("/{userId}/events/hosted")
    public ResponseEntity<List<UserEventResponse>> getHostedEvents(
            @PathVariable UUID userId,
            @RequestParam(required = false, defaultValue = "false") boolean miniOnly) {
        return ResponseEntity.ok(userEventsService.getHostedEvents(userId, miniOnly));
    }
}
