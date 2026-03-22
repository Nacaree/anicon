package com.anicon.backend.feed.dto;

import com.anicon.backend.social.dto.PostResponse;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Polymorphic feed item wrapper — each item is either a post or a scraped event.
 * The non-applicable field is null and omitted from JSON via @JsonInclude(NON_NULL).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FeedItemResponse(
    String type,                       // "post" or "scraped_event"
    PostResponse post,                 // non-null when type="post"
    ScrapedEventResponse scrapedEvent  // non-null when type="scraped_event"
) {
    public static FeedItemResponse ofPost(PostResponse post) {
        return new FeedItemResponse("post", post, null);
    }

    public static FeedItemResponse ofScrapedEvent(ScrapedEventResponse event) {
        return new FeedItemResponse("scraped_event", null, event);
    }
}
