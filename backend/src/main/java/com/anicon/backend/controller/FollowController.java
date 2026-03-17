package com.anicon.backend.controller;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.anicon.backend.dto.FollowUserResponse;
import com.anicon.backend.dto.ProfileResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.service.FollowService;
import com.anicon.backend.service.ProfileService;

@RestController
@RequestMapping("/api/follows")
public class FollowController {

    private final FollowService followService;
    private final ProfileService profileService;

    public FollowController(FollowService followService, ProfileService profileService) {
        this.followService = followService;
        this.profileService = profileService;
    }

    @PostMapping("/{userId}")
    public ResponseEntity<Void> followUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID currentUserId = Objects.requireNonNull(principal.getUserId());
        followService.followUser(currentUserId, userId);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> unfollowUser(
            @PathVariable UUID userId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID currentUserId = Objects.requireNonNull(principal.getUserId());
        followService.unfollowUser(currentUserId, userId);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/status")
    public ResponseEntity<Map<String, Boolean>> getFollowStatus(
            @PathVariable UUID userId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID currentUserId = Objects.requireNonNull(principal.getUserId());
        boolean isFollowing = followService.isFollowing(currentUserId, userId);

        return ResponseEntity.ok(Map.of("isFollowing", isFollowing));
    }

    @GetMapping("/{userId}/counts")
    public ResponseEntity<Map<String, Long>> getFollowCounts(@PathVariable UUID userId) {
        ProfileResponse profile = profileService.getProfile(userId);

        return ResponseEntity.ok(Map.of(
                "followerCount", profile.getFollowerCount(),
                "followingCount", profile.getFollowingCount()));
    }

    // Public — returns profiles of users who follow the given user
    // Optionally authenticated: if a JWT is present, includes isFollowing for each user
    @GetMapping("/{userId}/followers")
    public ResponseEntity<List<FollowUserResponse>> getFollowers(
            @PathVariable UUID userId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {
        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(followService.getFollowers(userId, currentUserId));
    }

    // Public — returns profiles of users the given user is following
    // Optionally authenticated: if a JWT is present, includes isFollowing for each user
    @GetMapping("/{userId}/following")
    public ResponseEntity<List<FollowUserResponse>> getFollowing(
            @PathVariable UUID userId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {
        UUID currentUserId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(followService.getFollowing(userId, currentUserId));
    }
}
