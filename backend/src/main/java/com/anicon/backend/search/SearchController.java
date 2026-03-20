package com.anicon.backend.search;

import com.anicon.backend.search.dto.SearchResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Global search endpoint — searches across users, events, and posts.
 *
 * Public with optional auth: guests can search freely, authenticated users
 * get additional state on results (e.g. likedByCurrentUser on posts).
 */
@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * @param q     Search query (required, min 1 char after trim)
     * @param type  Filter: "all", "users", "events", "posts" (default "all")
     * @param limit Max results per category (default 5, clamped to 1-20)
     */
    @GetMapping
    public ResponseEntity<SearchResponse> search(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestParam String q,
            @RequestParam(required = false, defaultValue = "all") String type,
            @RequestParam(required = false, defaultValue = "5") int limit) {

        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(searchService.search(q.trim(), type, limit, currentUserId));
    }
}
