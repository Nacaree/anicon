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
