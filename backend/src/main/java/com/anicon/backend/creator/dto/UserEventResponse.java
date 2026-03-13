package com.anicon.backend.creator.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Lightweight event DTO for profile event tabs (Going/Hosted).
 * Includes just enough data to render an event card on the profile page.
 */
public record UserEventResponse(
    UUID id,
    String title,
    String description,
    String coverImageUrl,
    LocalDate eventDate,
    LocalTime eventTime,
    String location,
    String eventType,
    Boolean isFree,
    BigDecimal ticketPrice,
    Integer currentAttendance,
    Integer maxCapacity,
    OffsetDateTime createdAt
) {}
