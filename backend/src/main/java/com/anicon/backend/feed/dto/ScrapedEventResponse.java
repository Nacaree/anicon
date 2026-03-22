package com.anicon.backend.feed.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO for scraped events in the unified feed.
 * Display-only — no social interaction fields (likes, comments, reposts).
 */
public record ScrapedEventResponse(
    UUID id,
    String title,
    String description,
    LocalDate eventDate,
    LocalTime eventTime,
    LocalTime endTime,
    String location,
    String coverImageUrl,
    String sourcePlatform,
    String sourceUrl,
    String sourcePageName,
    List<String> tags,
    OffsetDateTime createdAt
) {}
