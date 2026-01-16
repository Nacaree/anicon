package com.anicon.backend.controller;

import com.anicon.backend.service.FollowService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/follows")
public class FollowController {

    private final FollowService followService;

    public FollowController(FollowService followService) {
        this.followService = followService;
    }

    @PostMapping("/{userId}")
    public ResponseEntity<Void> followUser(
            @PathVariable UUID userId,
            Authentication authentication) {

        UUID currentUserId = (UUID) authentication.getPrincipal();
        followService.followUser(currentUserId, userId);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> unfollowUser(
            @PathVariable UUID userId,
            Authentication authentication) {

        UUID currentUserId = (UUID) authentication.getPrincipal();
        followService.unfollowUser(currentUserId, userId);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/status")
    public ResponseEntity<Map<String, Boolean>> getFollowStatus(
            @PathVariable UUID userId,
            Authentication authentication) {

        UUID currentUserId = (UUID) authentication.getPrincipal();
        boolean isFollowing = followService.isFollowing(currentUserId, userId);

        return ResponseEntity.ok(Map.of("isFollowing", isFollowing));
    }

    @GetMapping("/{userId}/counts")
    public ResponseEntity<Map<String, Long>> getFollowCounts(@PathVariable UUID userId) {
        long followerCount = followService.getFollowerCount(userId);
        long followingCount = followService.getFollowingCount(userId);

        return ResponseEntity.ok(Map.of(
            "followerCount", followerCount,
            "followingCount", followingCount
        ));
    }
}
