package com.anicon.backend.controller;

import com.anicon.backend.dto.AuthResponse;
import com.anicon.backend.dto.ProfileResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.service.ProfileService;
import com.anicon.backend.service.SupabaseAdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final ProfileService profileService;
    private final SupabaseAdminService supabaseAdminService;

    public AuthController(ProfileService profileService, SupabaseAdminService supabaseAdminService) {
        this.profileService = profileService;
        this.supabaseAdminService = supabaseAdminService;
    }

    /**
     * Returns the current authenticated user's info and profile.
     * If profile doesn't exist, auto-creates a minimal one.
     */
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        ProfileResponse profile = profileService.getOrCreateProfile(
                principal.getUserId(),
                principal.getEmail());

        AuthResponse response = AuthResponse.builder()
                .userId(principal.getUserId())
                .email(principal.getEmail())
                .emailVerified(principal.isEmailVerified())
                .profile(profile)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Deletes the current user's profile and Supabase auth user.
     * Used for cleanup when signup fails midway.
     */
    @DeleteMapping("/cleanup")
    public ResponseEntity<Void> cleanupUser(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        // Delete profile if exists
        profileService.deleteProfile(principal.getUserId());

        // Delete Supabase auth user
        supabaseAdminService.deleteUser(principal.getUserId());

        return ResponseEntity.ok().build();
    }

    /**
     * Resends the verification email to the specified email address.
     * This is a public endpoint (no auth required) since the user hasn't verified yet.
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody EmailRequest request) {
        supabaseAdminService.resendVerificationEmail(request.getEmail());
        return ResponseEntity.ok().build();
    }

    /**
     * Sends a magic link login email to the specified email address.
     * This is a public endpoint (no auth required).
     */
    @PostMapping("/magic-link")
    public ResponseEntity<Void> sendMagicLink(@Valid @RequestBody MagicLinkRequest request) {
        String redirectTo = request.getRedirectTo() != null
                ? request.getRedirectTo()
                : "http://localhost:3000/callback";

        supabaseAdminService.sendMagicLink(request.getEmail(), redirectTo);
        return ResponseEntity.ok().build();
    }

    @Data
    public static class EmailRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;
    }

    @Data
    public static class MagicLinkRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        private String redirectTo;
    }
}
