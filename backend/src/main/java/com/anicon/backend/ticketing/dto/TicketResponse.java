package com.anicon.backend.ticketing.dto;

import java.math.BigDecimal;
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
public class TicketResponse {

    private UUID id;
    private UUID eventId;
    private UUID userId;

    /** null for free events (no payment involved) */
    private UUID transactionId;

    /** Unique scannable code for event check-in */
    private String ticketCode;

    /** "issued", "checked_in", or "cancelled" */
    private String status;

    private OffsetDateTime checkedInAt;
    private OffsetDateTime createdAt;

    // Event details — populated by getMyTickets() via JOIN; null in other contexts
    private String eventTitle;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private String eventLocation;
    private String eventCoverImageUrl;
    private Boolean isFree;
    private BigDecimal ticketPrice;
}
