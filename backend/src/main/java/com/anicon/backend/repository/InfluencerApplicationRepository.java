package com.anicon.backend.repository;

import com.anicon.backend.entity.ApplicationStatus;
import com.anicon.backend.entity.InfluencerApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InfluencerApplicationRepository extends JpaRepository<InfluencerApplication, UUID> {

    List<InfluencerApplication> findByProfileId(UUID profileId);

    List<InfluencerApplication> findByStatus(ApplicationStatus status);

    Optional<InfluencerApplication> findByProfileIdAndStatus(UUID profileId, ApplicationStatus status);

    @Query("SELECT ia FROM InfluencerApplication ia WHERE ia.profileId = :profileId " +
           "ORDER BY ia.createdAt DESC LIMIT 1")
    Optional<InfluencerApplication> findLatestByProfileId(@Param("profileId") UUID profileId);

    boolean existsByProfileIdAndStatus(UUID profileId, ApplicationStatus status);
}
