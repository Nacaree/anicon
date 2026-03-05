package com.anicon.backend.ticketing;

import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.ticketing.dto.CreateEventRequest;
import com.anicon.backend.ticketing.dto.EventResponse;

import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * REST controller for event endpoints.
 *
 * Endpoint summary:
 *   GET  /api/events          — List upcoming events (public)
 *   GET  /api/events/{id}     — Get a single event by ID (public)
 *   POST /api/events          — Create a new event (auth required, role-gated)
 *
 * Auth rules (see SecurityConfig):
 *   - GET endpoints are public — anyone can browse events without logging in
 *   - POST requires a valid JWT; role permissions are enforced in EventService
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    /**
     * Lists all upcoming events (event_date >= today), sorted by date ascending.
     *
     * Public — no authentication required.
     * Frontend uses this to populate the home page and events discovery page.
     *
     * @return List of events, each including their tags. Empty list if none upcoming.
     */
    // Cache the events list at the CDN edge (Vercel) for 5 minutes, and in the
    // browser for 1 minute. s-maxage controls what Vercel caches; max-age controls
    // the browser. stale-while-revalidate lets the CDN serve a stale copy instantly
    // while it fetches a fresh one in the background — users never wait for a miss.
    private static final CacheControl EVENT_CACHE =
            CacheControl.maxAge(60, TimeUnit.SECONDS)
                    .cachePublic()
                    .sMaxAge(5, TimeUnit.MINUTES)
                    .staleWhileRevalidate(1, TimeUnit.HOURS);

    @GetMapping
    public ResponseEntity<List<EventResponse>> listEvents() {
        return ResponseEntity.ok()
                .cacheControl(EVENT_CACHE)
                .body(eventService.listUpcomingEvents());
    }

    /**
     * Fetches a single event by its ID, including tags.
     *
     * Public — no authentication required.
     * Frontend uses this for the /events/[id] detail page.
     *
     * @param id The event's UUID
     * @return The event, or 404 if not found
     */
    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEvent(@PathVariable UUID id) {
        return ResponseEntity.ok()
                .cacheControl(EVENT_CACHE)
                .body(eventService.getEvent(id));
    }

    /**
     * Creates a new event.
     *
     * Requires authentication. Role-based permission checks happen in EventService:
     *   - influencer → mini_event only, must be free
     *   - creator / organizer → any event type, free or paid
     *   - fan → 403 Forbidden
     *
     * Request body is validated with @Valid before reaching the service.
     * Returns 201 Created with the new event in the response body.
     *
     * @param req       Validated event creation payload
     * @param principal The authenticated user (injected from the JWT by Spring Security)
     * @return The created event with DB-generated fields (id, timestamps, etc.)
     */
    @PostMapping
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody CreateEventRequest req,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID callerId = Objects.requireNonNull(principal.getUserId());
        EventResponse created = eventService.createEvent(callerId, req);

        // 201 Created is more semantically correct than 200 OK for resource creation
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
