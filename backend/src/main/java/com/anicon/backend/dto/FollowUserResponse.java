package com.anicon.backend.dto;

import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Lightweight profile summary returned in follower/following lists
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUserResponse {
    private UUID id;
    private String username;
    private String displayName;
    private String avatarUrl;
    private String[] roles;
    private Long followerCount;
    // Whether the current (viewing) user follows this person — null when not authenticated
    private Boolean isFollowing;
}
