package com.anicon.backend.ticketing.dto;

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
}
