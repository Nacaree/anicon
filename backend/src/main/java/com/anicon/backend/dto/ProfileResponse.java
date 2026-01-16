package com.anicon.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

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
    private String organizationName;
    private Boolean isVerifiedOrganizer;
    private Map<String, String> socialLinks;
    private Long followerCount;
    private Long followingCount;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
