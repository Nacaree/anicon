package com.anicon.backend.ticketing.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RsvpResponse {

    private UUID id;
    private UUID eventId;
    private UUID userId;
    private OffsetDateTime createdAt;

    // Event details — populated by getMyRsvps() via JOIN
    private String eventTitle;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private String eventLocation;
    private String eventCoverImageUrl;
}
