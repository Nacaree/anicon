package com.anicon.backend.service;

import com.anicon.backend.dto.CreateProfileRequest;
import com.anicon.backend.dto.ProfileResponse;
import com.anicon.backend.entity.Profile;
import com.anicon.backend.repository.FollowRepository;
import com.anicon.backend.repository.ProfileRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final FollowRepository followRepository;

    public ProfileService(ProfileRepository profileRepository,
                         FollowRepository followRepository) {
        this.profileRepository = profileRepository;
        this.followRepository = followRepository;
    }

    @Transactional
    public ProfileResponse createProfile(UUID userId, CreateProfileRequest request) {
        // Check if username already exists
        if (profileRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken");
        }

        // Check if profile already exists for this user
        if (profileRepository.existsById(userId)) {
            throw new IllegalArgumentException("Profile already exists for this user");
        }

        Profile profile = Profile.builder()
            .id(userId)
            .username(request.getUsername())
            .displayName(request.getDisplayName())
            .roles(new String[]{"fan"})
            .build();

        profile = profileRepository.save(profile);

        return toProfileResponse(profile);
    }

    public ProfileResponse getProfile(UUID userId) {
        Profile profile = profileRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        return toProfileResponse(profile);
    }

    public ProfileResponse getProfileByUsername(String username) {
        Profile profile = profileRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        return toProfileResponse(profile);
    }

    /**
     * Gets an existing profile or creates a minimal one if it doesn't exist.
     * Used when a user logs in but doesn't have a profile (edge case).
     */
    @Transactional
    public ProfileResponse getOrCreateProfile(UUID userId, String email) {
        return profileRepository.findById(userId)
            .map(this::toProfileResponse)
            .orElseGet(() -> {
                // Generate a unique username from the user ID
                String generatedUsername = "user_" + userId.toString().substring(0, 8);

                // Check if generated username is taken and make it unique if needed
                String username = generatedUsername;
                int counter = 1;
                while (profileRepository.existsByUsername(username)) {
                    username = generatedUsername + counter;
                    counter++;
                }

                Profile profile = Profile.builder()
                    .id(userId)
                    .username(username)
                    .displayName("New User")
                    .roles(new String[]{"fan"})
                    .build();

                profile = profileRepository.save(profile);
                return toProfileResponse(profile);
            });
    }

    /**
     * Deletes a profile by user ID.
     * Used for cleanup when signup fails.
     */
    @Transactional
    public void deleteProfile(UUID userId) {
        profileRepository.deleteById(userId);
    }

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
