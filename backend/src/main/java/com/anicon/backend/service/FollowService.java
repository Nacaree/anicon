package com.anicon.backend.service;

import java.util.Objects;
import java.util.UUID;

import org.jooq.DSLContext;
import static org.jooq.impl.DSL.greatest;
import static org.jooq.impl.DSL.val;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import com.anicon.backend.entity.Follow;
import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;
import com.anicon.backend.repository.FollowRepository;
import com.anicon.backend.repository.ProfileRepository;

import jakarta.transaction.Transactional;

@Service
public class FollowService {

    private final FollowRepository followRepository;
    private final ProfileRepository profileRepository;
    private final DSLContext dsl; // JOOQ's main entry point
    private final CacheManager cacheManager;

    public FollowService(FollowRepository followRepository,
            ProfileRepository profileRepository,
            DSLContext dsl,
            CacheManager cacheManager) {
        this.followRepository = followRepository;
        this.profileRepository = profileRepository;
        this.dsl = dsl;
        this.cacheManager = cacheManager;
    }

    @Transactional
    public void followUser(UUID followerId, UUID followingId) {
        // Can't follow yourself
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("Cannot follow yourself");
        }

        // Check if following user exists
        if (!profileRepository.existsById(Objects.requireNonNull(followingId))) {
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

        followRepository.save(Objects.requireNonNull(follow));

        // Denormalization with JOOQ: Increment counts directly and type-safely.
        // This is far more efficient than loading an entity to update it.
        dsl.update(PROFILES)
                .set(PROFILES.FOLLOWING_COUNT, PROFILES.FOLLOWING_COUNT.plus(1))
                .where(PROFILES.ID.eq(followerId))
                .execute();
        dsl.update(PROFILES)
                .set(PROFILES.FOLLOWER_COUNT, PROFILES.FOLLOWER_COUNT.plus(1))
                .where(PROFILES.ID.eq(followingId))
                .execute();

        // Evict cache so users see updated counts immediately
        evictProfileCache(followerId);
        evictProfileCache(followingId);
    }

    @Transactional
    public void unfollowUser(UUID followerId, UUID followingId) {
        if (!followRepository.isFollowing(followerId, followingId)) {
            throw new IllegalArgumentException("Not following this user");
        }

        followRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);

        // Denormalization with JOOQ: Atomically decrement counts.
        // Using GREATEST() prevents race conditions where the count could dip below
        // zero.
        dsl.update(PROFILES)
                .set(PROFILES.FOLLOWING_COUNT, greatest(PROFILES.FOLLOWING_COUNT.minus(1), val(0L)))
                .where(PROFILES.ID.eq(followerId))
                .execute();
        dsl.update(PROFILES)
                .set(PROFILES.FOLLOWER_COUNT, greatest(PROFILES.FOLLOWER_COUNT.minus(1), val(0L)))
                .where(PROFILES.ID.eq(followingId))
                .execute();

        // Evict cache so users see updated counts immediately
        evictProfileCache(followerId);
        evictProfileCache(followingId);
    }

    public boolean isFollowing(UUID followerId, UUID followingId) {
        return followRepository.isFollowing(followerId, followingId);
    }

    private void evictProfileCache(UUID userId) {
        Cache cache = cacheManager.getCache("profiles");
        if (cache != null) {
            cache.evict(userId);
        }
    }

}
