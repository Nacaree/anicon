package com.anicon.backend.search.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Search result for an event.
 * Includes tags loaded via JOOQ multiset() — no N+1 queries.
 */
public record EventResult(
    UUID id,
    String title,
    String location,
    LocalDate eventDate,
    LocalTime eventTime,
    String category,
    String coverImageUrl,
    boolean isFree,
    BigDecimal ticketPrice,
    int currentAttendance,
    List<String> tags
) {}
