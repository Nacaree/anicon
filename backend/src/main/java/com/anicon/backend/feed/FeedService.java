package com.anicon.backend.feed;

import com.anicon.backend.feed.dto.*;
import com.anicon.backend.social.PostService;
import com.anicon.backend.social.dto.FeedResponse;
import com.anicon.backend.social.dto.PostResponse;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static com.anicon.backend.gen.jooq.tables.ScrapedEvents.SCRAPED_EVENTS;

/**
 * Unified feed service that merges posts and scraped events into a single
 * paginated feed, sorted by created_at DESC. Uses a two-pointer merge
 * algorithm — PostService handles post-specific batch-fetching (images,
 * likes, reposts) while this service queries scraped_events directly.
 */
@Service
public class FeedService {

    private final PostService postService;
    private final DSLContext dsl;

    public FeedService(PostService postService, DSLContext dsl) {
        this.postService = postService;
        this.dsl = dsl;
    }

    /**
     * Get a unified feed of posts + scraped events, merged by created_at DESC.
     * Optionally authenticated — currentUserId enables liked/reposted state on posts.
     */
    public UnifiedFeedResponse getFeed(String cursor, int limit, UUID currentUserId) {
        // Clamp limit to reasonable bounds
        limit = Math.max(1, Math.min(limit, 50));

        // 1. Fetch posts from PostService (handles all batch-fetching internally)
        FeedResponse postFeed = postService.getFeed(cursor, limit, currentUserId);
        List<PostResponse> posts = postFeed.posts() != null ? postFeed.posts() : List.of();
        boolean postsHasMore = postFeed.nextCursor() != null;

        // 2. Fetch scraped events with the same cursor
        List<ScrapedEventResponse> scrapedEvents = fetchScrapedEvents(cursor, limit);
        // Query limit+1 to detect hasMore — if we got more than limit, trim
        boolean eventsHasMore = scrapedEvents.size() > limit;
        if (eventsHasMore) {
            scrapedEvents = scrapedEvents.subList(0, limit);
        }

        // 3. Two-pointer merge by createdAt DESC, take first `limit` items
        List<FeedItemResponse> merged = new ArrayList<>(limit);
        int pi = 0, ei = 0;

        while (merged.size() < limit && (pi < posts.size() || ei < scrapedEvents.size())) {
            if (pi >= posts.size()) {
                // No more posts — take scraped event
                merged.add(FeedItemResponse.ofScrapedEvent(scrapedEvents.get(ei++)));
            } else if (ei >= scrapedEvents.size()) {
                // No more scraped events — take post
                merged.add(FeedItemResponse.ofPost(posts.get(pi++)));
            } else {
                // Compare timestamps — take the more recent one
                OffsetDateTime postTime = posts.get(pi).createdAt();
                OffsetDateTime eventTime = scrapedEvents.get(ei).createdAt();
                if (postTime != null && (eventTime == null || postTime.compareTo(eventTime) >= 0)) {
                    merged.add(FeedItemResponse.ofPost(posts.get(pi++)));
                } else {
                    merged.add(FeedItemResponse.ofScrapedEvent(scrapedEvents.get(ei++)));
                }
            }
        }

        // 4. Determine if there are more items from either source
        boolean hasMore = postsHasMore || eventsHasMore
                || pi < posts.size() || ei < scrapedEvents.size();

        // 5. Compute nextCursor from the last merged item
        String nextCursor = null;
        if (hasMore && !merged.isEmpty()) {
            FeedItemResponse lastItem = merged.get(merged.size() - 1);
            if ("post".equals(lastItem.type()) && lastItem.post() != null) {
                nextCursor = encodeCursor(lastItem.post().createdAt(), lastItem.post().id());
            } else if (lastItem.scrapedEvent() != null) {
                nextCursor = encodeCursor(lastItem.scrapedEvent().createdAt(), lastItem.scrapedEvent().id());
            }
        }

        return new UnifiedFeedResponse(merged, nextCursor);
    }

    /**
     * Query scraped_events with cursor-based pagination, ordered by created_at DESC.
     * Fetches limit+1 rows so the caller can detect whether more pages exist.
     */
    private List<ScrapedEventResponse> fetchScrapedEvents(String cursor, int limit) {
        Condition cursorCondition = DSL.noCondition();

        if (cursor != null) {
            CursorData cd = decodeCursor(cursor);
            if (cd != null) {
                // (created_at, id) < (cursorTime, cursorId) for "before this point" pagination
                cursorCondition = DSL.row(SCRAPED_EVENTS.CREATED_AT, SCRAPED_EVENTS.ID)
                        .lessThan(DSL.row(DSL.val(cd.createdAt()), DSL.val(cd.id())));
            }
        }

        return dsl.selectFrom(SCRAPED_EVENTS)
                .where(cursorCondition)
                .orderBy(SCRAPED_EVENTS.CREATED_AT.desc(), SCRAPED_EVENTS.ID.desc())
                .limit(limit + 1)
                .fetch(r -> new ScrapedEventResponse(
                        r.getId(),
                        r.getTitle(),
                        r.getDescription(),
                        r.getEventDate(),
                        r.getEventTime(),
                        r.getEndTime(),
                        r.getLocation(),
                        r.getCoverImageUrl(),
                        r.getSourcePlatform(),
                        r.getSourceUrl(),
                        r.getSourcePageName(),
                        r.getTags() != null ? Arrays.asList(r.getTags()) : List.of(),
                        r.getCreatedAt()
                ));
    }

    // ========================================
    // CURSOR ENCODING/DECODING
    // Same format as PostService: Base64(ISO_TIMESTAMP|UUID)
    // Duplicated here because PostService's methods are private.
    // ========================================

    private String encodeCursor(OffsetDateTime createdAt, UUID id) {
        String raw = createdAt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME) + "|" + id.toString();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private CursorData decodeCursor(String cursor) {
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", 2);
            if (parts.length != 2) return null;
            OffsetDateTime ts = OffsetDateTime.parse(parts[0], DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            UUID id = UUID.fromString(parts[1]);
            return new CursorData(ts, id);
        } catch (Exception e) {
            return null;
        }
    }

    private record CursorData(OffsetDateTime createdAt, UUID id) {}
}
