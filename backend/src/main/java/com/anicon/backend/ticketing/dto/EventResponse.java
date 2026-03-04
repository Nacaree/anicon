package com.anicon.backend.ticketing.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {

    private UUID id;
    private String title;
    private String location;
    private LocalDate eventDate;
    private LocalTime eventTime;

    private UUID organizerId;

    /** "mini_event" or "normal_event" */
    private String eventType;

    private String category;

    private Boolean isFree;

    /** null for free events */
    private BigDecimal ticketPrice;

    /** null = no cap */
    private Integer maxCapacity;

    /** Denormalized counter — do not derive from tickets/rsvps table */
    private Integer currentAttendance;

    private String coverImageUrl;

    private String description;

    private List<String> tags;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
