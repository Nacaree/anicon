package com.anicon.backend.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonRawValue;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private UUID id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String bio;
    private String[] roles;
    private String giftLink;
    private String bannerImageUrl;
    private Integer bannerPositionY;
    private String creatorType;
    // JSONB fields stored as raw JSON strings so JOOQ's fetchOptionalInto() can
    // map them (JOOQ returns JSONB as String, not Map/List). @JsonRawValue tells
    // Jackson to output the string as-is (not double-escaped) in the API response.
    @JsonRawValue
    private String supportLinks;
    private Boolean showSupportLinks;

    private String organizationName;
    private Boolean isVerifiedOrganizer;
    @JsonRawValue
    private String socialLinks;
    private Long followerCount;
    private Long followingCount;
    // Tracks the user's influencer application status ("pending", "approved", "rejected", or null).
    // Auto-mapped from DB column influencer_status by JOOQ's fetchOptionalInto().
    private String influencerStatus;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
