package com.anicon.backend.service;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.jooq.DSLContext;
import static org.jooq.impl.DSL.exists;
import static org.jooq.impl.DSL.greatest;
import static org.jooq.impl.DSL.selectOne;
import static org.jooq.impl.DSL.val;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import com.anicon.backend.dto.FollowUserResponse;
import com.anicon.backend.entity.Follow;
import com.anicon.backend.gen.jooq.enums.UserRole;
import static com.anicon.backend.gen.jooq.tables.Follows.FOLLOWS;
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
        if (followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
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
        if (!followRepository.existsByFollowerIdAndFollowingId(followerId, followingId)) {
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
        return followRepository.existsByFollowerIdAndFollowingId(followerId, followingId);
    }

    // Returns profiles of users who follow the given user.
    // If currentUserId is non-null, includes whether the viewer follows each person via EXISTS subquery.
    public List<FollowUserResponse> getFollowers(UUID userId, UUID currentUserId) {
        if (currentUserId != null) {
            // Authenticated — include isFollowing via correlated EXISTS subquery
            var vf = FOLLOWS.as("vf");
            return dsl.select(
                        PROFILES.ID,
                        PROFILES.USERNAME,
                        PROFILES.DISPLAY_NAME,
                        PROFILES.AVATAR_URL,
                        PROFILES.ROLES,
                        PROFILES.FOLLOWER_COUNT,
                        exists(selectOne().from(vf)
                                .where(vf.FOLLOWER_ID.eq(currentUserId)
                                        .and(vf.FOLLOWING_ID.eq(PROFILES.ID))))
                                .as("is_following"))
                    .from(FOLLOWS)
                    .join(PROFILES).on(PROFILES.ID.eq(FOLLOWS.FOLLOWER_ID))
                    .where(FOLLOWS.FOLLOWING_ID.eq(userId))
                    .orderBy(FOLLOWS.CREATED_AT.desc())
                    .fetch(r -> FollowUserResponse.builder()
                            .id(r.get(PROFILES.ID))
                            .username(r.get(PROFILES.USERNAME))
                            .displayName(r.get(PROFILES.DISPLAY_NAME))
                            .avatarUrl(r.get(PROFILES.AVATAR_URL))
                            .roles(rolesToStrings(r.get(PROFILES.ROLES)))
                            .followerCount(r.get(PROFILES.FOLLOWER_COUNT))
                            .isFollowing(r.get("is_following", Boolean.class))
                            .build());
        }

        // Unauthenticated — no isFollowing field
        return dsl.select(
                    PROFILES.ID,
                    PROFILES.USERNAME,
                    PROFILES.DISPLAY_NAME,
                    PROFILES.AVATAR_URL,
                    PROFILES.ROLES,
                    PROFILES.FOLLOWER_COUNT)
                .from(FOLLOWS)
                .join(PROFILES).on(PROFILES.ID.eq(FOLLOWS.FOLLOWER_ID))
                .where(FOLLOWS.FOLLOWING_ID.eq(userId))
                .orderBy(FOLLOWS.CREATED_AT.desc())
                .fetch(r -> FollowUserResponse.builder()
                        .id(r.get(PROFILES.ID))
                        .username(r.get(PROFILES.USERNAME))
                        .displayName(r.get(PROFILES.DISPLAY_NAME))
                        .avatarUrl(r.get(PROFILES.AVATAR_URL))
                        .roles(rolesToStrings(r.get(PROFILES.ROLES)))
                        .followerCount(r.get(PROFILES.FOLLOWER_COUNT))
                        .build());
    }

    // Returns profiles of users the given user is following.
    // If currentUserId is non-null, includes whether the viewer follows each person via EXISTS subquery.
    public List<FollowUserResponse> getFollowing(UUID userId, UUID currentUserId) {
        if (currentUserId != null) {
            var vf = FOLLOWS.as("vf");
            return dsl.select(
                        PROFILES.ID,
                        PROFILES.USERNAME,
                        PROFILES.DISPLAY_NAME,
                        PROFILES.AVATAR_URL,
                        PROFILES.ROLES,
                        PROFILES.FOLLOWER_COUNT,
                        exists(selectOne().from(vf)
                                .where(vf.FOLLOWER_ID.eq(currentUserId)
                                        .and(vf.FOLLOWING_ID.eq(PROFILES.ID))))
                                .as("is_following"))
                    .from(FOLLOWS)
                    .join(PROFILES).on(PROFILES.ID.eq(FOLLOWS.FOLLOWING_ID))
                    .where(FOLLOWS.FOLLOWER_ID.eq(userId))
                    .orderBy(FOLLOWS.CREATED_AT.desc())
                    .fetch(r -> FollowUserResponse.builder()
                            .id(r.get(PROFILES.ID))
                            .username(r.get(PROFILES.USERNAME))
                            .displayName(r.get(PROFILES.DISPLAY_NAME))
                            .avatarUrl(r.get(PROFILES.AVATAR_URL))
                            .roles(rolesToStrings(r.get(PROFILES.ROLES)))
                            .followerCount(r.get(PROFILES.FOLLOWER_COUNT))
                            .isFollowing(r.get("is_following", Boolean.class))
                            .build());
        }

        return dsl.select(
                    PROFILES.ID,
                    PROFILES.USERNAME,
                    PROFILES.DISPLAY_NAME,
                    PROFILES.AVATAR_URL,
                    PROFILES.ROLES,
                    PROFILES.FOLLOWER_COUNT)
                .from(FOLLOWS)
                .join(PROFILES).on(PROFILES.ID.eq(FOLLOWS.FOLLOWING_ID))
                .where(FOLLOWS.FOLLOWER_ID.eq(userId))
                .orderBy(FOLLOWS.CREATED_AT.desc())
                .fetch(r -> FollowUserResponse.builder()
                        .id(r.get(PROFILES.ID))
                        .username(r.get(PROFILES.USERNAME))
                        .displayName(r.get(PROFILES.DISPLAY_NAME))
                        .avatarUrl(r.get(PROFILES.AVATAR_URL))
                        .roles(rolesToStrings(r.get(PROFILES.ROLES)))
                        .followerCount(r.get(PROFILES.FOLLOWER_COUNT))
                        .build());
    }

    // Converts JOOQ UserRole[] enum array to String[] for the DTO
    private String[] rolesToStrings(UserRole[] roles) {
        if (roles == null) return new String[0];
        return Arrays.stream(roles).map(UserRole::getLiteral).toArray(String[]::new);
    }

    private void evictProfileCache(UUID userId) {
        Cache cache = cacheManager.getCache("profiles");
        if (cache != null) {
            cache.evict(userId);
        }
    }

}
