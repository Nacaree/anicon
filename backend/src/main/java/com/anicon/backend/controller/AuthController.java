package com.anicon.backend.controller;

import java.util.Map;
import java.util.Objects;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final DSLContext dsl;

    public AuthController(ProfileService profileService, DSLContext dsl) {
        this.profileService = profileService;
        this.dsl = dsl;
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
    /**
     * Checks whether an email address belongs to a registered user.
     *
     * Used by the forgot-password page to show immediate feedback ("no account found")
     * instead of silently sending a reset email to a non-existent address.
     *
     * Queries auth.users directly (the Supabase-managed auth table) because
     * the public profiles table does not store email.
     *
     * This endpoint is intentionally public — the user's intent is to show
     * the existence check visually (like signup's duplicate-email detection).
     */
    @PostMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.ok(Map.of("exists", false));
        }

        // auth.users is in the auth schema (Supabase-managed), not the public schema,
        // so it has no generated JOOQ types. Use a raw table/field reference instead.
        boolean exists = dsl.fetchExists(
            DSL.selectOne()
               .from(DSL.table(DSL.name("auth", "users")))
               .where(DSL.field("email", String.class).eq(email.trim().toLowerCase()))
        );

        return ResponseEntity.ok(Map.of("exists", exists));
    }

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
