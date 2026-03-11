package com.anicon.backend.ticketing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight status response for a single event+user combination.
 *
 * Returned by GET /api/tickets/event-status/{eventId} to power the
 * personalized "Grab Your Tickets" card on the event detail page.
 * Avoids fetching all user tickets just to check one event.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventTicketStatusResponse {

    /** Number of non-cancelled tickets the user holds for this event (paid events). 0 if none. */
    private int ticketCount;

    /** Whether the user has an active RSVP for this event (free events only). */
    private boolean hasRsvp;
}
