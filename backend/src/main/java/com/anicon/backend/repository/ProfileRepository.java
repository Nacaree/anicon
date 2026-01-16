package com.anicon.backend.repository;

import com.anicon.backend.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    Optional<Profile> findByUsername(String username);

    boolean existsByUsername(String username);

    @Query(value = """
        SELECT p.*,
               (SELECT COUNT(*) FROM follows WHERE following_id = p.id) as follower_count,
               (SELECT COUNT(*) FROM follows WHERE follower_id = p.id) as following_count
        FROM profiles p
        WHERE p.id = :profileId
        """, nativeQuery = true)
    Optional<Profile> findByIdWithCounts(@Param("profileId") UUID profileId);
}
