package com.anicon.backend.service;

import com.anicon.backend.entity.Follow;
import com.anicon.backend.repository.FollowRepository;
import com.anicon.backend.repository.ProfileRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class FollowService {

    private final FollowRepository followRepository;
    private final ProfileRepository profileRepository;

    public FollowService(FollowRepository followRepository,
                        ProfileRepository profileRepository) {
        this.followRepository = followRepository;
        this.profileRepository = profileRepository;
    }

    @Transactional
    public void followUser(UUID followerId, UUID followingId) {
        // Can't follow yourself
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("Cannot follow yourself");
        }

        // Check if following user exists
        if (!profileRepository.existsById(followingId)) {
            throw new IllegalArgumentException("User to follow not found");
        }

        // Check if already following
        if (followRepository.isFollowing(followerId, followingId)) {
            throw new IllegalArgumentException("Already following this user");
        }

        Follow follow = Follow.builder()
            .followerId(followerId)
            .followingId(followingId)
            .build();

        followRepository.save(follow);
    }

    @Transactional
    public void unfollowUser(UUID followerId, UUID followingId) {
        if (!followRepository.isFollowing(followerId, followingId)) {
            throw new IllegalArgumentException("Not following this user");
        }

        followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
    }

    public boolean isFollowing(UUID followerId, UUID followingId) {
        return followRepository.isFollowing(followerId, followingId);
    }

    public long getFollowerCount(UUID profileId) {
        return followRepository.countFollowers(profileId);
    }

    public long getFollowingCount(UUID profileId) {
        return followRepository.countFollowing(profileId);
    }
}
