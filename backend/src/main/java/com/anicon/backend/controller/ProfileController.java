package com.anicon.backend.controller;

import com.anicon.backend.dto.CreateProfileRequest;
import com.anicon.backend.dto.ProfileResponse;
import com.anicon.backend.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping
    public ResponseEntity<ProfileResponse> createProfile(
            @Valid @RequestBody CreateProfileRequest request,
            Authentication authentication) {

        UUID userId = (UUID) authentication.getPrincipal();
        ProfileResponse profile = profileService.createProfile(userId, request);

        return ResponseEntity.status(HttpStatus.CREATED).body(profile);
    }

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getCurrentProfile(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        ProfileResponse profile = profileService.getProfile(userId);

        return ResponseEntity.ok(profile);
    }

    @GetMapping("/{username}")
    public ResponseEntity<ProfileResponse> getProfileByUsername(@PathVariable String username) {
        ProfileResponse profile = profileService.getProfileByUsername(username);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ProfileResponse> getProfileById(@PathVariable UUID userId) {
        ProfileResponse profile = profileService.getProfile(userId);
        return ResponseEntity.ok(profile);
    }
}
