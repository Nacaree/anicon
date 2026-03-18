package com.anicon.backend.service;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.jooq.DSLContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.dto.InfluencerApplicationRequest;
import com.anicon.backend.dto.InfluencerApplicationResponse;
import com.anicon.backend.entity.ApplicationStatus;
import com.anicon.backend.entity.InfluencerApplication;
import com.anicon.backend.gen.jooq.enums.UserRole;
import com.anicon.backend.repository.InfluencerApplicationRepository;

import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

/**
 * Handles influencer (verified host) application submissions and status checks.
 * Uses JPA for application CRUD and JOOQ for profile column updates
 * (same mixed pattern as CreatorService).
 */
@Service
public class InfluencerApplicationService {

    private final InfluencerApplicationRepository applicationRepository;
    private final DSLContext dsl;

    public InfluencerApplicationService(InfluencerApplicationRepository applicationRepository,
                                         DSLContext dsl) {
        this.applicationRepository = applicationRepository;
        this.dsl = dsl;
    }

    /**
     * Submit an application to become a verified host (influencer).
     * Guards against: already an influencer, duplicate pending application,
     * and reapply cooldown after rejection.
     */
    public InfluencerApplicationResponse submitApplication(UUID userId, InfluencerApplicationRequest request) {
        // Check user's current roles
        UserRole[] roles = dsl.select(PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOne(PROFILES.ROLES);

        if (roles == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
        }

        // Already an influencer — no need to apply
        for (UserRole role : roles) {
            if (role == UserRole.influencer) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "You are already a verified host");
            }
        }

        // Check for existing pending application
        if (applicationRepository.existsByProfileIdAndStatus(userId, ApplicationStatus.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a pending application");
        }

        // Check reapply cooldown if previously rejected
        Optional<InfluencerApplication> latest = applicationRepository.findLatestByProfileId(userId);
        if (latest.isPresent()) {
            InfluencerApplication prev = latest.get();
            if (prev.getStatus() == ApplicationStatus.REJECTED
                    && prev.getCanReapplyAt() != null
                    && OffsetDateTime.now().isBefore(prev.getCanReapplyAt())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "You cannot reapply until " + prev.getCanReapplyAt());
            }
        }

        // Build and save the application
        InfluencerApplication application = InfluencerApplication.builder()
                .profileId(userId)
                .reason(request.reason())
                .communityInvolvement(request.communityInvolvement())
                .socialProofLinks(request.socialProofLinks() != null ? request.socialProofLinks() : java.util.Map.of())
                .build();

        InfluencerApplication saved = applicationRepository.save(application);

        // Update influencer_status on the profile so frontend can show pending state
        dsl.update(PROFILES)
                .set(PROFILES.INFLUENCER_STATUS,
                        com.anicon.backend.gen.jooq.enums.ApplicationStatus.pending)
                .where(PROFILES.ID.eq(userId))
                .execute();

        return toResponse(saved);
    }

    /**
     * Get the current user's most recent application.
     * Returns empty if they have never applied.
     */
    public Optional<InfluencerApplicationResponse> getMyApplication(UUID userId) {
        return applicationRepository.findLatestByProfileId(userId)
                .map(this::toResponse);
    }

    private InfluencerApplicationResponse toResponse(InfluencerApplication app) {
        return new InfluencerApplicationResponse(
                app.getId(),
                app.getProfileId(),
                app.getStatus().getValue(),
                app.getReason(),
                app.getCommunityInvolvement(),
                app.getSocialProofLinks(),
                app.getRejectionReason(),
                app.getCanReapplyAt(),
                app.getCreatedAt()
        );
    }
}
