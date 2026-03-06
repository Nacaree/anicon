package com.anicon.backend.ticketing;

import com.anicon.backend.gen.jooq.enums.EventType;
import com.anicon.backend.gen.jooq.enums.UserRole;
import com.anicon.backend.gen.jooq.tables.records.EventsRecord;
import com.anicon.backend.ticketing.dto.CreateEventRequest;
import com.anicon.backend.ticketing.dto.EventResponse;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record;
import org.jooq.Record1;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static com.anicon.backend.gen.jooq.tables.EventTags.EVENT_TAGS;
import static com.anicon.backend.gen.jooq.tables.Events.EVENTS;
import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;
import static com.anicon.backend.gen.jooq.tables.Tags.TAGS;
import static org.jooq.impl.DSL.*;

/**
 * Service layer for all event operations.
 *
 * Design notes:
 * - Uses JOOQ DSLContext directly (no JPA entities or repositories for ticketing tables)
 * - Role permission checks happen here before touching the DB, with clear error messages
 * - The DB also enforces some of these rules via check constraints (e.g. mini_event must be free)
 *   but we fail fast at the service layer for a better user-facing error message
 */
@Service
public class EventService {

    private final DSLContext dsl;

    public EventService(DSLContext dsl) {
        this.dsl = dsl;
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Creates a new event for the authenticated caller.
     *
     * Full flow:
     * 1. Fetch the caller's roles (only the roles column — no need for the full profile)
     * 2. Validate that their role allows the requested event type + pricing
     * 3. Inside a single transaction:
     *    a. Insert the event row (DB generates id, current_attendance=0, timestamps)
     *    b. For each tag name: upsert into tags table (no error if tag already exists)
     *    c. Link each tag to the event via the event_tags junction table
     *
     * Role permission matrix (see docs/ticketing_schema_design_guide.md):
     *   fan        → cannot create events (403)
     *   influencer → mini_event only, and it must always be free
     *   creator    → any event type, free or paid
     *   organizer  → any event type, free or paid
     *
     * @param callerId UUID of the authenticated user, taken from the JWT in the controller
     * @param req      Validated request body (@Valid applied in the controller)
     * @return The created event with its tags
     */
    public EventResponse createEvent(UUID callerId, CreateEventRequest req) {
        // Fetch only the roles column — avoids loading unnecessary profile data
        UserRole[] roles = dsl.select(PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(callerId))
                .fetchOne(PROFILES.ROLES);

        if (roles == null) {
            // This should not happen in normal operation since a profile is created
            // automatically by the DB trigger on signup. If it's missing, something went wrong.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
        }

        // Parse the event type string ("mini_event" / "normal_event") into the JOOQ enum
        EventType eventType = EventType.lookupLiteral(req.getEventType());
        if (eventType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid event_type. Must be 'mini_event' or 'normal_event'");
        }

        // Check role permissions before touching any write path
        checkEventPermission(roles, eventType, req.getIsFree());

        List<String> tagNames = req.getTags() != null ? req.getTags() : List.of();

        // Wrap the insert + tag linking in a transaction.
        // If tag insertion or junction linking fails, the event insert rolls back too.
        return dsl.transactionResult(ctx -> {
            DSLContext tx = using(ctx);

            // Insert the event row. RETURNING * gives us back all DB-generated fields
            // (id, current_attendance default 0, created_at, updated_at).
            EventsRecord event = tx.insertInto(EVENTS)
                    .set(EVENTS.TITLE, req.getTitle())
                    .set(EVENTS.LOCATION, req.getLocation())
                    .set(EVENTS.EVENT_DATE, req.getEventDate())
                    .set(EVENTS.EVENT_TIME, req.getEventTime())
                    .set(EVENTS.ORGANIZER_ID, callerId)
                    .set(EVENTS.EVENT_TYPE, eventType)
                    .set(EVENTS.CATEGORY, req.getCategory())
                    .set(EVENTS.IS_FREE, req.getIsFree())
                    .set(EVENTS.TICKET_PRICE, req.getTicketPrice())   // null for free events
                    .set(EVENTS.MAX_CAPACITY, req.getMaxCapacity())   // null = no cap
                    .set(EVENTS.COVER_IMAGE_URL, req.getCoverImageUrl())
                    .set(EVENTS.DESCRIPTION, req.getDescription())
                    .returning()
                    .fetchOne();

            // Handle tags: upsert then link
            for (String rawTag : tagNames) {
                // Normalize: lowercase and trim whitespace before inserting
                String tagName = rawTag.toLowerCase().trim();

                // Insert the tag if it doesn't already exist.
                // ON CONFLICT DO NOTHING means this is safe to call even if the tag exists.
                tx.insertInto(TAGS)
                        .set(TAGS.NAME, tagName)
                        .onConflict(TAGS.NAME)
                        .doNothing()
                        .execute();

                // Now fetch the tag's ID by name.
                // The tag is guaranteed to exist after the upsert above, whether it was
                // just inserted or already existed before.
                UUID tagId = tx.select(TAGS.ID)
                        .from(TAGS)
                        .where(TAGS.NAME.eq(tagName))
                        .fetchOne(TAGS.ID);

                // Link the tag to this event in the junction table
                tx.insertInto(EVENT_TAGS)
                        .set(EVENT_TAGS.EVENT_ID, event.getId())
                        .set(EVENT_TAGS.TAG_ID, tagId)
                        .execute();
            }

            // We already know the tag names from the request, so pass them directly
            // instead of re-querying the DB
            return toEventResponse(event, tagNames);
        });
    }

    /**
     * Fetches a single event by ID, including its tags.
     *
     * Uses JOOQ's multiset() to load the event and its tags in one SQL query.
     * Multiset translates to a correlated subquery that returns a nested result set —
     * no N+1 problem, no manual GROUP BY or array_agg needed.
     *
     * @throws ResponseStatusException 404 if the event doesn't exist
     */
    public EventResponse getEvent(UUID eventId) {
        var tagsField = tagsSubquery();

        var record = dsl.select(
                        EVENTS.ID, EVENTS.TITLE, EVENTS.LOCATION,
                        EVENTS.EVENT_DATE, EVENTS.EVENT_TIME, EVENTS.ORGANIZER_ID,
                        EVENTS.EVENT_TYPE, EVENTS.CATEGORY, EVENTS.IS_FREE,
                        EVENTS.TICKET_PRICE, EVENTS.MAX_CAPACITY, EVENTS.CURRENT_ATTENDANCE,
                        EVENTS.COVER_IMAGE_URL, EVENTS.DESCRIPTION, EVENTS.CREATED_AT, EVENTS.UPDATED_AT,
                        PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL,
                        PROFILES.ROLES, PROFILES.FOLLOWER_COUNT, PROFILES.FOLLOWING_COUNT,
                        tagsField)
                .from(EVENTS)
                // LEFT JOIN so missing profile rows don't 404 the event (should never happen,
                // but defensive against orphaned organizer_id references)
                .leftJoin(PROFILES).on(PROFILES.ID.eq(EVENTS.ORGANIZER_ID))
                .where(EVENTS.ID.eq(eventId))
                .fetchOne();

        if (record == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }

        return mapRow(record, tagsField);
    }

    /**
     * Lists all upcoming events (event_date >= today), sorted by date ascending.
     * Each event includes its tags, loaded via multiset (one query total, no N+1).
     */
    public List<EventResponse> listUpcomingEvents() {
        var tagsField = tagsSubquery();

        return dsl.select(
                        EVENTS.ID, EVENTS.TITLE, EVENTS.LOCATION,
                        EVENTS.EVENT_DATE, EVENTS.EVENT_TIME, EVENTS.ORGANIZER_ID,
                        EVENTS.EVENT_TYPE, EVENTS.CATEGORY, EVENTS.IS_FREE,
                        EVENTS.TICKET_PRICE, EVENTS.MAX_CAPACITY, EVENTS.CURRENT_ATTENDANCE,
                        EVENTS.COVER_IMAGE_URL, EVENTS.DESCRIPTION, EVENTS.CREATED_AT, EVENTS.UPDATED_AT,
                        PROFILES.USERNAME, PROFILES.DISPLAY_NAME, PROFILES.AVATAR_URL,
                        PROFILES.ROLES, PROFILES.FOLLOWER_COUNT, PROFILES.FOLLOWING_COUNT,
                        tagsField)
                .from(EVENTS)
                // LEFT JOIN so events with missing profile rows are still returned
                .leftJoin(PROFILES).on(PROFILES.ID.eq(EVENTS.ORGANIZER_ID))
                .where(EVENTS.EVENT_DATE.greaterOrEqual(LocalDate.now()))
                .orderBy(EVENTS.EVENT_DATE.asc())
                .fetch()
                .map(r -> mapRow(r, tagsField));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Builds the correlated subquery that fetches tag names for each event row.
     *
     * JOOQ's multiset() generates a correlated subquery like:
     *   (SELECT DISTINCT t.name FROM tags t JOIN event_tags et ON et.tag_id = t.id
     *    WHERE et.event_id = events.id)
     *
     * convertFrom maps each result row (Record1<String>) to just the String value,
     * so the field type is Field<List<String>> — no manual mapping needed.
     *
     * We return a new instance each time so each query gets its own field reference,
     * which is required for JOOQ to correctly match the field in Record.get(field).
     */
    private Field<List<String>> tagsSubquery() {
        return multiset(
                selectDistinct(TAGS.NAME)
                        .from(TAGS)
                        .join(EVENT_TAGS).on(EVENT_TAGS.TAG_ID.eq(TAGS.ID))
                        .where(EVENT_TAGS.EVENT_ID.eq(EVENTS.ID))
        ).as("tags").convertFrom(r -> r.map(Record1::value1));
    }

    /**
     * Enforces role-based event creation rules.
     *
     * Called before any DB writes so we get a clear 403 message instead of a
     * DB constraint violation bubbling up.
     */
    private void checkEventPermission(UserRole[] roles, EventType eventType, boolean isFree) {
        List<UserRole> roleList = Arrays.asList(roles);

        // Creator and organizer have full access — all event types, free or paid
        if (roleList.contains(UserRole.creator) || roleList.contains(UserRole.organizer)) {
            return;
        }

        // Influencer: mini_event only, and it must be free
        // Note: the DB also enforces mini_event = free via the `mini_event_must_be_free`
        // check constraint, but we validate here first to return a descriptive message
        if (roleList.contains(UserRole.influencer)) {
            if (eventType != EventType.mini_event) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Influencers can only create mini events");
            }
            if (!isFree) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Influencer events must be free");
            }
            return;
        }

        // Fan (default role) cannot create events
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You do not have permission to create events");
    }

    /**
     * Maps an EventsRecord (from INSERT...RETURNING) to EventResponse.
     *
     * Used after createEvent, where tag names are already known from the request.
     * Passing them directly avoids an extra SELECT after the insert.
     */
    private EventResponse toEventResponse(EventsRecord r, List<String> tags) {
        return EventResponse.builder()
                .id(r.getId())
                .title(r.getTitle())
                .location(r.getLocation())
                .eventDate(r.getEventDate())
                .eventTime(r.getEventTime())
                .organizerId(r.getOrganizerId())
                .eventType(r.getEventType().getLiteral())
                .category(r.getCategory())
                .isFree(r.getIsFree())
                .ticketPrice(r.getTicketPrice())
                .maxCapacity(r.getMaxCapacity())
                .currentAttendance(r.getCurrentAttendance())
                .coverImageUrl(r.getCoverImageUrl())
                .description(r.getDescription())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .tags(tags)
                .build();
    }

    /**
     * Maps a JOOQ Record (from a SELECT with multiset) to EventResponse.
     *
     * The tagsField parameter must be the same Field instance used in the SELECT —
     * JOOQ uses field identity (not just the alias string) to look up the value in the record.
     */
    private EventResponse mapRow(Record r, Field<List<String>> tagsField) {
        // Build embedded organizer info — null only if the LEFT JOIN found no matching profile row
        UserRole[] roleValues = r.get(PROFILES.ROLES);
        EventResponse.OrganizerInfo organizer = null;
        if (r.get(PROFILES.USERNAME) != null) {
            organizer = EventResponse.OrganizerInfo.builder()
                    .username(r.get(PROFILES.USERNAME))
                    .displayName(r.get(PROFILES.DISPLAY_NAME))
                    .avatarUrl(r.get(PROFILES.AVATAR_URL))
                    // Convert UserRole[] enum array to List<String> of literals (e.g. "organizer", "creator")
                    .roles(roleValues != null
                            ? Arrays.stream(roleValues).map(UserRole::getLiteral).toList()
                            : List.of())
                    .followerCount(r.get(PROFILES.FOLLOWER_COUNT))
                    .followingCount(r.get(PROFILES.FOLLOWING_COUNT))
                    .build();
        }

        return EventResponse.builder()
                .id(r.get(EVENTS.ID))
                .title(r.get(EVENTS.TITLE))
                .location(r.get(EVENTS.LOCATION))
                .eventDate(r.get(EVENTS.EVENT_DATE))
                .eventTime(r.get(EVENTS.EVENT_TIME))
                .organizerId(r.get(EVENTS.ORGANIZER_ID))
                .eventType(r.get(EVENTS.EVENT_TYPE).getLiteral())
                .category(r.get(EVENTS.CATEGORY))
                .isFree(r.get(EVENTS.IS_FREE))
                .ticketPrice(r.get(EVENTS.TICKET_PRICE))
                .maxCapacity(r.get(EVENTS.MAX_CAPACITY))
                .currentAttendance(r.get(EVENTS.CURRENT_ATTENDANCE))
                .coverImageUrl(r.get(EVENTS.COVER_IMAGE_URL))
                .description(r.get(EVENTS.DESCRIPTION))
                .createdAt(r.get(EVENTS.CREATED_AT))
                .updatedAt(r.get(EVENTS.UPDATED_AT))
                .tags(r.get(tagsField))
                .organizer(organizer)
                .build();
    }
}
