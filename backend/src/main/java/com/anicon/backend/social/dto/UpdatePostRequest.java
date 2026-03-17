package com.anicon.backend.social.dto;

/**
 * Request body for editing a post. Only text is editable after creation.
 */
public record UpdatePostRequest(
    String textContent
) {}
