package com.anicon.backend.service;

import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.dto.ProfileResponse;
import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

/**
 * Service layer for profile operations.
 *
 * Key Design Principle (from PLANNING2.md):
 * - Profiles are NEVER created by the backend manually
 * - Database trigger (on_auth_user_created → handle_new_user) automatically
 * creates
 * profiles when users sign up through Supabase Auth
 * - This service only FETCHES and UPDATES existing profiles
 *
 * Why this matters:
 * - Ensures atomic profile creation (no race conditions)
 * - Centralizes profile creation logic in the database
 * - Backend remains stateless and only handles business logic
 */
@Service
@Transactional(readOnly = true)
public class ProfileService {

    private final DSLContext dsl;

    /**
     * Constructor injection for DSLContext.
     *
     * @param dsl jOOQ DSLContext for type-safe SQL queries
     */
    public ProfileService(DSLContext dsl) {
        this.dsl = dsl;
    }

    /**
     * Fetches a user's profile by their Supabase user ID.
     *
     * Used by:
     * - AuthController.getCurrentUser() - When user requests their own profile
     * - ProfileController.getProfileById() - When viewing another user's profile
     *
     * @param userId The Supabase auth.users ID (UUID)
     * @return ProfileResponse with profile data + follower/following counts
     * @throws IllegalArgumentException if profile doesn't exist (indicates database
     *                                  issue)
     */
    @Cacheable(value = "profiles", key = "#userId")
    public ProfileResponse getProfile(UUID userId) {
        return dsl.selectFrom(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOptionalInto(ProfileResponse.class)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }

    /**
     * Fetches a user's profile by their unique username.
     *
     * Used by:
     * - ProfileController.getProfileByUsername() - Public profile viewing
     * - Frontend when navigating to /@username routes
     *
     * Username constraints (enforced by database):
     * - Max 20 characters
     * - Alphanumeric + underscore only (regex: ^[a-zA-Z0-9_]{1,20}$)
     * - Unique across all users
     *
     * @param username The user's unique username (case-sensitive)
     * @return ProfileResponse with profile data + follower/following counts
     * @throws IllegalArgumentException if username doesn't exist
     */
    public ProfileResponse getProfileByUsername(String username) {
        return dsl.selectFrom(PROFILES)
                .where(PROFILES.USERNAME.eq(username))
                .fetchOptionalInto(ProfileResponse.class)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }
}
