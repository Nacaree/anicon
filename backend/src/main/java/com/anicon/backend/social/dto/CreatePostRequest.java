package com.anicon.backend.social.dto;

import java.util.List;

/**
 * Request body for creating a new post.
 * textContent is required (max 500 chars).
 * imageUrls are optional — up to 10 already-uploaded Supabase Storage URLs.
 */
public record CreatePostRequest(
    String textContent,
    List<String> imageUrls
) {}
