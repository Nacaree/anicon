package com.anicon.backend.controller;

import com.anicon.backend.dto.ProfileResponse;
import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for profile-related endpoints.
 *
 * Endpoint Structure:
 * - GET /api/profiles/me - Get current authenticated user's profile (requires auth)
 * - GET /api/profiles/{username} - Get profile by username (public)
 * - GET /api/profiles/user/{userId} - Get profile by UUID (public)
 *
 * Security:
 * - /me endpoint requires JWT authentication (SecurityConfig)
 * - Username and userId endpoints are public (for viewing other users)
 * - Rate limiting applied via RateLimitFilter (30 req/min for public endpoints)
 *
 * Frontend Usage:
 * - /me: Called by AuthContext after login to fetch user's profile
 * - /{username}: Used when navigating to @username profile pages
 * - /user/{userId}: Used when you have UUID but not username (e.g., from follows)
 */
@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final ProfileService profileService;

    /**
     * Constructor injection for ProfileService.
     *
     * @param profileService Service layer handling profile business logic
     */
    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /**
     * Get the currently authenticated user's own profile.
     *
     * Request Flow:
     * 1. Frontend sends: GET /api/profiles/me with Authorization: Bearer <token>
     * 2. JwtAuthenticationFilter validates token and creates SupabaseUserPrincipal
     * 3. Spring Security injects principal into this method
     * 4. ProfileService fetches profile from database
     * 5. Returns profile with follower/following counts
     *
     * Used by:
     * - AuthContext.fetchProfile() after successful login
     * - Profile settings page to display user's own data
     *
     * @param principal Authenticated user (injected by Spring Security)
     * @return ProfileResponse with all profile fields + follower counts
     */
    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getCurrentProfile(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {
        // Fetch the authenticated user's profile
        ProfileResponse profile = profileService.getProfile(principal.getUserId());

        return ResponseEntity.ok(profile);
    }

    /**
     * Get any user's profile by their username (public endpoint).
     *
     * Request Flow:
     * 1. Frontend sends: GET /api/profiles/{username} (no auth required)
     * 2. ProfileService queries database by username
     * 3. Returns profile with follower/following counts
     *
     * Used by:
     * - Public profile pages (/@username routes)
     * - User search results
     * - Displaying user info in event attendee lists
     *
     * @param username The target user's unique username (case-sensitive)
     * @return ProfileResponse if user exists
     * @throws IllegalArgumentException (400 Bad Request) if username not found
     */
    @GetMapping("/{username}")
    public ResponseEntity<ProfileResponse> getProfileByUsername(@PathVariable String username) {
        // Fetch profile by unique username
        ProfileResponse profile = profileService.getProfileByUsername(username);
        return ResponseEntity.ok(profile);
    }

    /**
     * Get any user's profile by their Supabase user ID (public endpoint).
     *
     * Request Flow:
     * 1. Frontend sends: GET /api/profiles/user/{userId} (no auth required)
     * 2. ProfileService queries database by UUID
     * 3. Returns profile with follower/following counts
     *
     * Used by:
     * - Follow lists (when you have follower UUIDs but need full profiles)
     * - Event organizer details
     * - Any context where you have UUID but not username
     *
     * @param userId The target user's Supabase auth.users ID (UUID)
     * @return ProfileResponse if user exists
     * @throws IllegalArgumentException (400 Bad Request) if user ID not found
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ProfileResponse> getProfileById(@PathVariable UUID userId) {
        // Fetch profile by Supabase user ID
        ProfileResponse profile = profileService.getProfile(userId);
        return ResponseEntity.ok(profile);
    }
}
