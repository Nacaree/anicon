package com.anicon.backend.social.dto;

import java.util.List;

/**
 * Request body for editing a post. Text and images are editable.
 */
public record UpdatePostRequest(
    String textContent,
    List<String> imageUrls
) {}
