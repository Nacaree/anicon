package com.anicon.backend.controller;

import java.util.Objects;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.anicon.backend.dto.AuthResponse;
import com.anicon.backend.dto.ProfileResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.service.ProfileService;

/**
 * REST controller for authentication-related endpoints.
 *
 * Endpoint Structure:
 * - GET /api/auth/me - Get current user info + profile (requires auth)
 *
 * Auth Strategy (PLANNING2.md):
 * - Supabase handles ALL authentication (signup, login, password management)
 * - Backend ONLY validates JWT tokens and fetches user data
 * - Database trigger auto-creates profiles on signup (backend never creates
 * them)
 *
 * Security:
 * - /me requires valid JWT token (validated by JwtAuthenticationFilter)
 * - Public endpoints have strict rate limiting (10 req/min for auth endpoints)
 * - All password handling done by Supabase (never touches backend)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final ProfileService profileService;

    /**
     * Constructor injection for services.
     *
     * @param profileService Service for fetching user profiles
     */
    public AuthController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /**
     * Returns the current authenticated user's info and profile.
     *
     * Authentication Flow (PLANNING2.md):
     * 1. Frontend sends JWT token in Authorization header
     * 2. JwtAuthenticationFilter validates the token using Supabase's public key
     * 3. Filter creates SupabaseUserPrincipal with user ID, email, emailVerified
     * status
     * 4. This endpoint receives the authenticated principal
     * 5. Fetches the user's profile from the database
     * 6. Returns combined auth info + profile data
     *
     * Note: Profile MUST exist because it's automatically created by the database
     * trigger
     * (on_auth_user_created → handle_new_user) when the user signs up through
     * Supabase.
     * If profile is missing, it indicates a system error or database issue.
     *
     * @param principal The authenticated user's principal (injected by Spring
     *                  Security)
     * @return AuthResponse containing user ID, email, verification status, and full
     *         profile
     */
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        // Fetch the profile from database (created automatically by trigger on signup)
        ProfileResponse profile = profileService.getProfile(Objects.requireNonNull(principal.getUserId()));

        // Build response combining authentication info and profile data
        AuthResponse response = AuthResponse.builder()
                .userId(principal.getUserId())
                .email(principal.getEmail())
                .profile(profile)
                .build();

        return ResponseEntity.ok(response);
    }
}
