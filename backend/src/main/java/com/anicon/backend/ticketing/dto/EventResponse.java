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

    /**
     * Organizer's public profile data, embedded in the event response to avoid
     * a second round-trip to /api/profiles/user/{id} on the event detail page.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganizerInfo {
        private String username;
        private String displayName;
        private String avatarUrl;
        private List<String> roles;
        private Long followerCount;
        private Long followingCount;
    }

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

    /** Null when the organizer profile row is missing (should not happen in practice). */
    private OrganizerInfo organizer;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
