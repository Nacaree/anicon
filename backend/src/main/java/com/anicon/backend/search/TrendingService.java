package com.anicon.backend.search;

import java.time.OffsetDateTime;
import java.util.List;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.anicon.backend.search.dto.HashtagResult;

import static com.anicon.backend.gen.jooq.tables.PostTags.POST_TAGS;
import static com.anicon.backend.gen.jooq.tables.Posts.POSTS;
import static com.anicon.backend.gen.jooq.tables.Tags.TAGS;

/**
 * Queries trending hashtags from the post_tags junction table.
 * Results are cached for 5 minutes (Caffeine) since trends don't change per-second.
 */
@Service
public class TrendingService {

    private final DSLContext dsl;

    public TrendingService(DSLContext dsl) {
        this.dsl = dsl;
    }

    /**
     * Returns the most-used hashtags across posts from the last 7 days.
     * Uses an indexed JOIN on post_tags → tags → posts, much faster than
     * regex scanning all post text on every request.
     *
     * @param limit Max number of trending hashtags to return (clamped to 1-10)
     * @return List of HashtagResult ordered by post_count DESC
     */
    @Cacheable(cacheNames = "trending", key = "'top-' + #limit")
    public List<HashtagResult> getTrendingHashtags(int limit) {
        int clampedLimit = Math.min(Math.max(limit, 1), 10);

        // Alias columns to match HashtagResult record field names
        return dsl.select(
                        TAGS.NAME.as("hashtag"),
                        DSL.count(POST_TAGS.POST_ID).as("post_count"))
                .from(POST_TAGS)
                .join(TAGS).on(TAGS.ID.eq(POST_TAGS.TAG_ID))
                .join(POSTS).on(POSTS.ID.eq(POST_TAGS.POST_ID))
                .where(POSTS.IS_DELETED.eq(false))
                .and(POSTS.CREATED_AT.ge(OffsetDateTime.now().minusDays(7)))
                .groupBy(TAGS.NAME)
                .orderBy(DSL.count(POST_TAGS.POST_ID).desc())
                .limit(clampedLimit)
                .fetchInto(HashtagResult.class);
    }
}
