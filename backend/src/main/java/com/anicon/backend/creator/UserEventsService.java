package com.anicon.backend.creator;

import com.anicon.backend.creator.dto.UserEventResponse;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import static com.anicon.backend.gen.jooq.tables.EventRsvps.EVENT_RSVPS;
import static com.anicon.backend.gen.jooq.tables.Events.EVENTS;
import static com.anicon.backend.gen.jooq.tables.Tickets.TICKETS;

/**
 * Service for fetching events associated with a user's profile tabs.
 * Two views: "going" (RSVP + tickets) and "hosted" (organizer_id match).
 */
@Service
public class UserEventsService {

    private final DSLContext dsl;

    public UserEventsService(DSLContext dsl) {
        this.dsl = dsl;
    }

    /**
     * Get events the user is attending — combines RSVPs (free events) and
     * tickets (paid events, non-cancelled) into a single list sorted by date desc.
     */
    public List<UserEventResponse> getGoingEvents(UUID userId) {
        // Event IDs from free-event RSVPs
        var rsvpEventIds = dsl.select(EVENT_RSVPS.EVENT_ID)
                .from(EVENT_RSVPS)
                .where(EVENT_RSVPS.USER_ID.eq(userId));

        // Event IDs from paid tickets (exclude cancelled)
        var ticketEventIds = dsl.select(TICKETS.EVENT_ID)
                .from(TICKETS)
                .where(TICKETS.USER_ID.eq(userId))
                .and(TICKETS.STATUS.ne(com.anicon.backend.gen.jooq.enums.TicketStatus.cancelled));

        // Union both sets and fetch the events
        return dsl.selectFrom(EVENTS)
                .where(EVENTS.ID.in(rsvpEventIds)
                        .or(EVENTS.ID.in(ticketEventIds)))
                .orderBy(EVENTS.EVENT_DATE.desc())
                .fetch(this::toResponse);
    }

    /**
     * Get events hosted by the user (where they are the organizer).
     *
     * @param miniOnly if true, only return mini_event type (for influencers who can only host mini events)
     */
    public List<UserEventResponse> getHostedEvents(UUID userId, boolean miniOnly) {
        var query = dsl.selectFrom(EVENTS)
                .where(EVENTS.ORGANIZER_ID.eq(userId));

        if (miniOnly) {
            query = query.and(EVENTS.EVENT_TYPE.eq(com.anicon.backend.gen.jooq.enums.EventType.mini_event));
        }

        return query
                .orderBy(EVENTS.EVENT_DATE.desc())
                .fetch(this::toResponse);
    }

    /** Map a JOOQ EventsRecord to the lightweight profile-tab DTO */
    private UserEventResponse toResponse(Record r) {
        return new UserEventResponse(
                r.get(EVENTS.ID),
                r.get(EVENTS.TITLE),
                r.get(EVENTS.DESCRIPTION),
                r.get(EVENTS.COVER_IMAGE_URL),
                r.get(EVENTS.EVENT_DATE),
                r.get(EVENTS.EVENT_TIME),
                r.get(EVENTS.LOCATION),
                r.get(EVENTS.EVENT_TYPE).getLiteral(),
                r.get(EVENTS.IS_FREE),
                r.get(EVENTS.TICKET_PRICE),
                r.get(EVENTS.CURRENT_ATTENDANCE),
                r.get(EVENTS.MAX_CAPACITY),
                r.get(EVENTS.CREATED_AT)
        );
    }
}
