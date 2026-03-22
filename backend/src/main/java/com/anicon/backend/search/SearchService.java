package com.anicon.backend.search;

import com.anicon.backend.gen.jooq.enums.UserRole;
import com.anicon.backend.search.dto.*;
import com.anicon.backend.social.dto.PostAuthorResponse;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Record1;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

import static com.anicon.backend.gen.jooq.tables.Events.EVENTS;
import static com.anicon.backend.gen.jooq.tables.EventTags.EVENT_TAGS;
import static com.anicon.backend.gen.jooq.tables.PostImages.POST_IMAGES;
import static com.anicon.backend.gen.jooq.tables.PostLikes.POST_LIKES;
import static com.anicon.backend.gen.jooq.tables.Posts.POSTS;
import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;
import static com.anicon.backend.gen.jooq.tables.ScrapedEvents.SCRAPED_EVENTS;
import static com.anicon.backend.gen.jooq.tables.Tags.TAGS;
import static org.jooq.impl.DSL.*;

/**
 * Searches across users, events, and posts using ILIKE substring matching.
 *
 * Uses generated JOOQ types for type safety. Query patterns follow EventService
 * (multiset for tags) and PostService (batch-fetch for images/likes).
 */
@Service
public class SearchService {

    private final DSLContext dsl;

    public SearchService(DSLContext dsl) {
        this.dsl = dsl;
    }

    /**
     * Main entry point — dispatches to type-specific search methods based on the "type" param.
     * Returns empty lists (not null) for excluded types.
     *
     * @param query         Search term (already trimmed, min 1 char)
     * @param type          "all", "users", "events", or "posts"
     * @param limit         Max results per category (clamped to 1-20)
     * @param currentUserId Nullable — if present, post results include likedByCurrentUser state
     */
    public SearchResponse search(String query, String type, int limit, UUID currentUserId) {
        int clampedLimit = Math.min(Math.max(limit, 1), 20);

        // Strip leading "@" — users type @username to find profiles, but usernames
        // don't contain "@" so ILIKE would fail without this normalization.
        // When query starts with "@", auto-scope to users-only for "all" searches.
        boolean isMention = query.startsWith("@");
        String normalizedQuery = isMention ? query.substring(1) : query;

        if (normalizedQuery.isBlank()) {
            return new SearchResponse(List.of(), List.of(), List.of(), List.of());
        }

        List<UserResult> users = List.of();
        List<EventResult> events = List.of();
        List<PostResult> posts = List.of();
        List<ScrapedEventSearchResult> scrapedEvents = List.of();

        switch (type) {
            case "users" -> users = searchUsers(normalizedQuery, clampedLimit);
            case "events" -> events = searchEvents(normalizedQuery, clampedLimit);
            case "posts" -> posts = searchPosts(normalizedQuery, clampedLimit, currentUserId);
            case "scraped_events" -> scrapedEvents = searchScrapedEvents(normalizedQuery, clampedLimit);
            default -> {
                // "all" or any unrecognized value — search everything.
                // @mention queries auto-scope to users only since the intent is clear.
                users = searchUsers(normalizedQuery, clampedLimit);
                if (!isMention) {
                    events = searchEvents(normalizedQuery, clampedLimit);
                    posts = searchPosts(normalizedQuery, clampedLimit, currentUserId);
                    scrapedEvents = searchScrapedEvents(normalizedQuery, clampedLimit);
                }
            }
        }

        return new SearchResponse(users, events, posts, scrapedEvents);
    }

    // -----------------------------------------------------------------------
    // User search — matches username and display_name, ordered by popularity
    // -----------------------------------------------------------------------

    private List<UserResult> searchUsers(String query, int limit) {
        String pattern = "%" + query + "%";

        return dsl.select(
                    PROFILES.ID,
                    PROFILES.USERNAME,
                    PROFILES.DISPLAY_NAME,
                    PROFILES.AVATAR_URL,
                    PROFILES.ROLES,
                    PROFILES.FOLLOWER_COUNT)
                .from(PROFILES)
                .where(PROFILES.USERNAME.likeIgnoreCase(pattern)
                        .or(PROFILES.DISPLAY_NAME.likeIgnoreCase(pattern)))
                .orderBy(PROFILES.FOLLOWER_COUNT.desc())
                .limit(limit)
                .fetch(r -> {
                    UserRole[] roles = r.get(PROFILES.ROLES);
                    String[] roleStrings = roles != null
                            ? Arrays.stream(roles).map(Enum::name).toArray(String[]::new)
                            : new String[]{};
                    return new UserResult(
                            r.get(PROFILES.ID),
                            r.get(PROFILES.USERNAME),
                            r.get(PROFILES.DISPLAY_NAME),
                            r.get(PROFILES.AVATAR_URL),
                            roleStrings,
                            r.get(PROFILES.FOLLOWER_COUNT));
                });
    }

    // -----------------------------------------------------------------------
    // Event search — matches title, description, location, and tags.
    // Only returns future events, ordered by date.
    // Tags loaded via multiset() in one round-trip (same pattern as EventService).
    // -----------------------------------------------------------------------

    private List<EventResult> searchEvents(String query, int limit) {
        String pattern = "%" + query + "%";

        // Each call creates a new multiset field instance — required for JOOQ to
        // correctly match the field in Record.get(). See EventService.tagsSubquery().
        Field<List<String>> tagsField = multiset(
                selectDistinct(TAGS.NAME)
                        .from(TAGS)
                        .join(EVENT_TAGS).on(EVENT_TAGS.TAG_ID.eq(TAGS.ID))
                        .where(EVENT_TAGS.EVENT_ID.eq(EVENTS.ID))
        ).as("tags").convertFrom(r -> r.map(Record1::value1));

        // Match title, description, location, OR tag name via a subquery on event_tags/tags
        var tagMatchSubquery = select(EVENT_TAGS.EVENT_ID)
                .from(EVENT_TAGS)
                .join(TAGS).on(TAGS.ID.eq(EVENT_TAGS.TAG_ID))
                .where(TAGS.NAME.likeIgnoreCase(pattern));

        return dsl.select(
                    EVENTS.ID,
                    EVENTS.TITLE,
                    EVENTS.LOCATION,
                    EVENTS.EVENT_DATE,
                    EVENTS.EVENT_TIME,
                    EVENTS.CATEGORY,
                    EVENTS.COVER_IMAGE_URL,
                    EVENTS.IS_FREE,
                    EVENTS.TICKET_PRICE,
                    EVENTS.CURRENT_ATTENDANCE,
                    tagsField)
                .from(EVENTS)
                .where(EVENTS.TITLE.likeIgnoreCase(pattern)
                        .or(EVENTS.DESCRIPTION.likeIgnoreCase(pattern))
                        .or(EVENTS.LOCATION.likeIgnoreCase(pattern))
                        .or(EVENTS.ID.in(tagMatchSubquery)))
                .and(EVENTS.EVENT_DATE.greaterOrEqual(LocalDate.now()))
                .orderBy(EVENTS.EVENT_DATE.asc())
                .limit(limit)
                .fetch(r -> new EventResult(
                        r.get(EVENTS.ID),
                        r.get(EVENTS.TITLE),
                        r.get(EVENTS.LOCATION),
                        r.get(EVENTS.EVENT_DATE),
                        r.get(EVENTS.EVENT_TIME),
                        r.get(EVENTS.CATEGORY),
                        r.get(EVENTS.COVER_IMAGE_URL),
                        r.get(EVENTS.IS_FREE),
                        r.get(EVENTS.TICKET_PRICE),
                        r.get(EVENTS.CURRENT_ATTENDANCE),
                        r.get(tagsField)));
    }

    // -----------------------------------------------------------------------
    // Scraped event search — matches title, description, and location.
    // No date filter — past events are included for searchable archive.
    // -----------------------------------------------------------------------

    private List<ScrapedEventSearchResult> searchScrapedEvents(String query, int limit) {
        String pattern = "%" + query + "%";

        return dsl.select(
                    SCRAPED_EVENTS.ID,
                    SCRAPED_EVENTS.TITLE,
                    SCRAPED_EVENTS.DESCRIPTION,
                    SCRAPED_EVENTS.EVENT_DATE,
                    SCRAPED_EVENTS.LOCATION,
                    SCRAPED_EVENTS.COVER_IMAGE_URL,
                    SCRAPED_EVENTS.SOURCE_PLATFORM,
                    SCRAPED_EVENTS.SOURCE_URL)
                .from(SCRAPED_EVENTS)
                .where(SCRAPED_EVENTS.TITLE.likeIgnoreCase(pattern)
                        .or(SCRAPED_EVENTS.DESCRIPTION.likeIgnoreCase(pattern))
                        .or(SCRAPED_EVENTS.LOCATION.likeIgnoreCase(pattern)))
                .orderBy(SCRAPED_EVENTS.CREATED_AT.desc())
                .limit(limit)
                .fetch(r -> new ScrapedEventSearchResult(
                        r.get(SCRAPED_EVENTS.ID),
                        r.get(SCRAPED_EVENTS.TITLE),
                        r.get(SCRAPED_EVENTS.DESCRIPTION),
                        r.get(SCRAPED_EVENTS.EVENT_DATE),
                        r.get(SCRAPED_EVENTS.LOCATION),
                        r.get(SCRAPED_EVENTS.COVER_IMAGE_URL),
                        r.get(SCRAPED_EVENTS.SOURCE_PLATFORM),
                        r.get(SCRAPED_EVENTS.SOURCE_URL)));
    }

    // -----------------------------------------------------------------------
    // Post search — matches text_content. Batch-fetches author info (via JOIN),
    // first image, and liked state to avoid N+1 queries.
    // -----------------------------------------------------------------------

    private List<PostResult> searchPosts(String query, int limit, UUID currentUserId) {
        String pattern = "%" + query + "%";

        // Step 1: Fetch posts joined with author profile
        var records = dsl.select(
                    POSTS.ID,
                    POSTS.USER_ID,
                    POSTS.TEXT_CONTENT,
                    POSTS.LIKE_COUNT,
                    POSTS.COMMENT_COUNT,
                    POSTS.REPOST_COUNT,
                    POSTS.CREATED_AT,
                    PROFILES.ID,
                    PROFILES.USERNAME,
                    PROFILES.DISPLAY_NAME,
                    PROFILES.AVATAR_URL,
                    PROFILES.ROLES)
                .from(POSTS)
                .join(PROFILES).on(POSTS.USER_ID.eq(PROFILES.ID))
                .where(POSTS.TEXT_CONTENT.likeIgnoreCase(pattern))
                .and(POSTS.IS_DELETED.isFalse())
                // Only search original posts — reposts have no unique text content
                .and(POSTS.ORIGINAL_POST_ID.isNull())
                .orderBy(POSTS.CREATED_AT.desc())
                .limit(limit)
                .fetch();

        if (records.isEmpty()) {
            return List.of();
        }

        List<UUID> postIds = records.stream().map(r -> r.get(POSTS.ID)).toList();

        // Step 2: Batch-fetch the first image for each post (display_order = 0)
        Map<UUID, String> firstImageByPost = new HashMap<>();
        dsl.select(POST_IMAGES.POST_ID, POST_IMAGES.IMAGE_URL)
                .from(POST_IMAGES)
                .where(POST_IMAGES.POST_ID.in(postIds))
                .and(POST_IMAGES.DISPLAY_ORDER.eq(0))
                .fetch()
                .forEach(r -> firstImageByPost.put(
                        r.get(POST_IMAGES.POST_ID),
                        r.get(POST_IMAGES.IMAGE_URL)));

        // Step 3: Batch-fetch liked status for the current user (if authenticated)
        Set<UUID> likedIds = Collections.emptySet();
        if (currentUserId != null) {
            likedIds = new HashSet<>(dsl.select(POST_LIKES.POST_ID)
                    .from(POST_LIKES)
                    .where(POST_LIKES.USER_ID.eq(currentUserId))
                    .and(POST_LIKES.POST_ID.in(postIds))
                    .fetch(POST_LIKES.POST_ID));
        }

        // Step 4: Assemble PostResult list
        final Set<UUID> finalLikedIds = likedIds;
        return records.stream().map(r -> {
            UUID postId = r.get(POSTS.ID);

            // Build author from the joined profile columns
            UserRole[] roles = r.get(PROFILES.ROLES);
            String[] roleStrings = roles != null
                    ? Arrays.stream(roles).map(Enum::name).toArray(String[]::new)
                    : new String[]{};
            var author = new PostAuthorResponse(
                    r.get(PROFILES.ID),
                    r.get(PROFILES.USERNAME),
                    r.get(PROFILES.DISPLAY_NAME),
                    r.get(PROFILES.AVATAR_URL),
                    roleStrings);

            return new PostResult(
                    postId,
                    author,
                    r.get(POSTS.TEXT_CONTENT),
                    firstImageByPost.get(postId),
                    r.get(POSTS.LIKE_COUNT),
                    r.get(POSTS.COMMENT_COUNT),
                    r.get(POSTS.REPOST_COUNT),
                    finalLikedIds.contains(postId),
                    r.get(POSTS.CREATED_AT));
        }).toList();
    }
}
