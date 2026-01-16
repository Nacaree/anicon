package com.anicon.backend.repository;

import com.anicon.backend.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Follow.FollowId> {

    @Query("SELECT COUNT(f) FROM Follow f WHERE f.followingId = :profileId")
    long countFollowers(@Param("profileId") UUID profileId);

    @Query("SELECT COUNT(f) FROM Follow f WHERE f.followerId = :profileId")
    long countFollowing(@Param("profileId") UUID profileId);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END " +
           "FROM Follow f WHERE f.followerId = :followerId AND f.followingId = :followingId")
    boolean isFollowing(@Param("followerId") UUID followerId,
                       @Param("followingId") UUID followingId);

    Optional<Follow> findByFollowerIdAndFollowingId(UUID followerId, UUID followingId);

    void deleteByFollowerIdAndFollowingId(UUID followerId, UUID followingId);
}
