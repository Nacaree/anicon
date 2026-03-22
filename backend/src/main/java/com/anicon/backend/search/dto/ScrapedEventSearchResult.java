package com.anicon.backend.search.dto;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Lightweight search result for scraped events.
 * Used in SearchDropdown and SearchResultsPage "Discovered" section.
 */
public record ScrapedEventSearchResult(
    UUID id,
    String title,
    String description,
    LocalDate eventDate,
    String location,
    String coverImageUrl,
    String sourcePlatform,
    String sourceUrl
) {}
