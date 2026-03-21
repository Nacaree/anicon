package com.anicon.backend.search;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.anicon.backend.search.dto.HashtagResult;

/**
 * Public endpoint for trending hashtags.
 * Used by the right sidebar "Trending now" section.
 */
@RestController
@RequestMapping("/api/trending")
public class TrendingController {

    private final TrendingService trendingService;

    public TrendingController(TrendingService trendingService) {
        this.trendingService = trendingService;
    }

    /**
     * Returns the most popular hashtags from posts in the last 7 days.
     * Results are cached server-side for 5 minutes.
     *
     * @param limit Number of trending hashtags to return (default 4, max 10)
     */
    @GetMapping
    public ResponseEntity<List<HashtagResult>> getTrending(
            @RequestParam(defaultValue = "4") int limit) {
        return ResponseEntity.ok(trendingService.getTrendingHashtags(limit));
    }
}
