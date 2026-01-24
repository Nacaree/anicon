package com.anicon.backend.service;

import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.anicon.backend.dto.ProfileResponse;
import com.anicon.backend.entity.Profile;
import com.anicon.backend.repository.FollowRepository;
import com.anicon.backend.repository.ProfileRepository;

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

    private final ProfileRepository profileRepository;
    private final FollowRepository followRepository;

    /**
     * Constructor injection for repositories.
     *
     * @param profileRepository JPA repository for profile CRUD operations
     * @param followRepository  JPA repository to calculate follower/following
     *                          counts
     */
    public ProfileService(ProfileRepository profileRepository,
            FollowRepository followRepository) {
        this.profileRepository = profileRepository;
        this.followRepository = followRepository;
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
    public ProfileResponse getProfile(UUID userId) {
        // Fetch profile from database (must exist due to signup trigger)
        Profile profile = profileRepository.findById(Objects.requireNonNull(userId))
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        // Convert entity to DTO and enrich with follower counts
        return toProfileResponse(profile);
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
        // Fetch profile by unique username
        Profile profile = profileRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        // Convert entity to DTO and enrich with follower counts
        return toProfileResponse(profile);
    }

    /**
     * Converts a Profile entity to a ProfileResponse DTO.
     *
     * This method enriches the profile data with calculated follower/following
     * counts
     * by querying the follows table. These counts are computed on-demand rather
     * than
     * stored in the profiles table to ensure data consistency.
     *
     * Flow:
     * 1. Takes a Profile entity from the database
     * 2. Queries the follows table to count how many users follow this profile
     * 3. Queries the follows table to count how many users this profile follows
     * 4. Combines all data into a ProfileResponse DTO for API responses
     *
     * @param profile The Profile entity to convert
     * @return ProfileResponse with all profile fields + calculated follower counts
     */

    private ProfileResponse toProfileResponse(Profile profile) {
        long followerCount = followRepository.countFollowers(profile.getId());
        long followingCount = followRepository.countFollowing(profile.getId());

        return ProfileResponse.builder()
                .id(profile.getId())
                .username(profile.getUsername())
                .displayName(profile.getDisplayName())
                .avatarUrl(profile.getAvatarUrl())
                .bio(profile.getBio())
                .roles(profile.getRoles())
                .giftLink(profile.getGiftLink())
                .organizationName(profile.getOrganizationName())
                .isVerifiedOrganizer(profile.getIsVerifiedOrganizer())
                .socialLinks(profile.getSocialLinks())
                .followerCount(followerCount)
                .followingCount(followingCount)
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
