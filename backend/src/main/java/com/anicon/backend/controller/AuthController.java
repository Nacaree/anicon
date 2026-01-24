package com.anicon.backend.controller;

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
import com.anicon.backend.service.SupabaseAdminService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * REST controller for authentication-related endpoints.
 *
 * Endpoint Structure:
 * - GET /api/auth/me - Get current user info + profile (requires auth)
 * - POST /api/auth/resend-verification - Resend email verification (public)
 * - POST /api/auth/magic-link - Send magic link login email (public)
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
    private final SupabaseAdminService supabaseAdminService;

    /**
     * Constructor injection for services.
     *
     * @param profileService       Service for fetching user profiles
     * @param supabaseAdminService Service for Supabase Admin API operations
     */
    public AuthController(ProfileService profileService, SupabaseAdminService supabaseAdminService) {
        this.profileService = profileService;
        this.supabaseAdminService = supabaseAdminService;
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
        ProfileResponse profile = profileService.getProfile(principal.getUserId());

        // Build response combining authentication info and profile data
        AuthResponse response = AuthResponse.builder()
                .userId(principal.getUserId())
                .email(principal.getEmail())
                .profile(profile)
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Resends the verification email to the specified email address.
     *
     * Use Case:
     * - User signs up but verification email never arrives
     * - User accidentally deletes verification email
     * - Email expired (Supabase verification links have expiration)
     *
     * Flow:
     * 1. Frontend sends: POST /api/auth/resend-verification with { email }
     * 2. Backend calls Supabase Admin API using service_role key
     * 3. Supabase sends new verification email to user
     * 4. Returns 200 OK regardless of whether email exists (security best practice)
     *
     * Security:
     * - Public endpoint (user may not have verified yet, so no JWT)
     * - Rate limited to 10 req/min to prevent abuse
     * - Uses service_role key (backend-only, never exposed to frontend)
     *
     * Frontend Usage:
     * - Login page when user sees "Please verify your email" message
     * - Verify email page with "Resend Email" button
     *
     * @param request EmailRequest containing the user's email address
     * @return 200 OK (doesn't reveal if email exists for security)
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<Void> resendVerification(@Valid @RequestBody EmailRequest request) {
        // Call Supabase Admin API to trigger verification email
        supabaseAdminService.resendVerificationEmail(request.getEmail());
        return ResponseEntity.ok().build();
    }

    /**
     * Sends a magic link (passwordless login) email to the specified email address.
     *
     * Magic Link Flow:
     * 1. User enters email on login page (clicks "Login with magic link")
     * 2. Frontend sends: POST /api/auth/magic-link with { email, redirectTo }
     * 3. Backend calls Supabase Admin API to send magic link
     * 4. User receives email with one-time login link
     * 5. Clicking link logs user in and redirects to redirectTo URL
     * 6. Frontend receives session token via callback
     *
     * Advantages of Magic Links:
     * - No password required (better UX for mobile)
     * - More secure than passwords (one-time use, expires quickly)
     * - Reduces password reset requests
     *
     * Security:
     * - Public endpoint (no auth required for login flow)
     * - Rate limited to 10 req/min to prevent email spam
     * - Magic links expire after 1 hour (Supabase default)
     * - One-time use only
     *
     * Frontend Usage:
     * - Login page "Email me a login link" option
     * - Used in AuthContext.signInWithMagicLink()
     *
     * @param request MagicLinkRequest containing email and optional redirect URL
     * @return 200 OK (doesn't reveal if email exists for security)
     */
    @PostMapping("/magic-link")
    public ResponseEntity<Void> sendMagicLink(@Valid @RequestBody MagicLinkRequest request) {
        // Use provided redirect URL or default to local callback
        String redirectTo = request.getRedirectTo() != null
                ? request.getRedirectTo()
                : "http://localhost:3000/auth/callback";

        // Call Supabase Admin API to send magic link email
        supabaseAdminService.sendMagicLink(request.getEmail(), redirectTo);
        return ResponseEntity.ok().build();
    }

    /**
     * DTO for email-only requests (resend verification).
     */
    @Data
    public static class EmailRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;
    }

    /**
     * DTO for magic link requests (email + optional redirect URL).
     */
    @Data
    public static class MagicLinkRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        // Optional redirect URL after successful magic link login
        // Defaults to http://localhost:3000/auth/callback if not provided
        private String redirectTo;
    }
}
