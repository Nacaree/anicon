package com.anicon.backend.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.dto.InfluencerApplicationRequest;
import com.anicon.backend.dto.InfluencerApplicationResponse;
import com.anicon.backend.gen.jooq.enums.ApplicationStatus;
import com.anicon.backend.gen.jooq.enums.UserRole;
import com.anicon.backend.gen.jooq.tables.records.InfluencerApplicationsRecord;
import org.springframework.cache.CacheManager;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import static com.anicon.backend.gen.jooq.tables.InfluencerApplications.INFLUENCER_APPLICATIONS;
import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

/**
 * Handles influencer (verified host) application submissions and status checks.
 * Uses JOOQ exclusively — no JPA entities or repositories.
 */
@Service
public class InfluencerApplicationService {

    private final DSLContext dsl;
    private final ObjectMapper objectMapper;
    private final CacheManager cacheManager;

    public InfluencerApplicationService(DSLContext dsl, ObjectMapper objectMapper, CacheManager cacheManager) {
        this.dsl = dsl;
        this.objectMapper = objectMapper;
        this.cacheManager = cacheManager;
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
        boolean hasPending = dsl.fetchExists(
                dsl.selectFrom(INFLUENCER_APPLICATIONS)
                        .where(INFLUENCER_APPLICATIONS.PROFILE_ID.eq(userId))
                        .and(INFLUENCER_APPLICATIONS.STATUS.eq(ApplicationStatus.pending))
        );
        if (hasPending) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a pending application");
        }

        // Check reapply cooldown if previously rejected
        InfluencerApplicationsRecord latest = dsl.selectFrom(INFLUENCER_APPLICATIONS)
                .where(INFLUENCER_APPLICATIONS.PROFILE_ID.eq(userId))
                .orderBy(INFLUENCER_APPLICATIONS.CREATED_AT.desc())
                .limit(1)
                .fetchOne();

        if (latest != null
                && latest.getStatus() == ApplicationStatus.rejected
                && latest.getCanReapplyAt() != null
                && OffsetDateTime.now().isBefore(latest.getCanReapplyAt())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You cannot reapply until " + latest.getCanReapplyAt());
        }

        // Insert the application with all verification data
        InfluencerApplicationsRecord record = dsl.newRecord(INFLUENCER_APPLICATIONS);
        record.setProfileId(userId);
        record.setIdCardImageUrl(request.idCardImageUrl());
        record.setSocialProofLinks(JSONB.jsonb(toJson(request.socialProofLinks())));
        record.setFollowerCount(request.followerCount());
        record.setEventTypes(JSONB.jsonb(toJson(request.eventTypes())));
        record.setContentLink(request.contentLink());
        record.setStatus(ApplicationStatus.pending);
        record.store();

        // Auto-approve: for the thesis demo there's no admin panel, so grant
        // influencer role immediately on application submission.
        record.setStatus(ApplicationStatus.approved);
        record.setReviewedAt(OffsetDateTime.now());
        record.store();

        // Replace roles with {influencer} — can't append because {fan,influencer}
        // violates the valid_role_combo constraint (only single roles or {creator,organizer} allowed)
        dsl.update(PROFILES)
                .set(PROFILES.ROLES, org.jooq.impl.DSL.field(
                        "'{influencer}'::user_role[]", UserRole[].class))
                .set(PROFILES.INFLUENCER_STATUS, ApplicationStatus.approved)
                .set(PROFILES.INFLUENCER_VERIFIED_AT, OffsetDateTime.now())
                .where(PROFILES.ID.eq(userId))
                .execute();

        // Evict this user's cached profile so the next fetch returns the updated roles
        cacheManager.getCache("profiles").evict(userId);

        return toResponse(record);
    }

    /**
     * Get the current user's most recent application.
     * Returns empty if they have never applied.
     */
    public Optional<InfluencerApplicationResponse> getMyApplication(UUID userId) {
        return Optional.ofNullable(
                dsl.selectFrom(INFLUENCER_APPLICATIONS)
                        .where(INFLUENCER_APPLICATIONS.PROFILE_ID.eq(userId))
                        .orderBy(INFLUENCER_APPLICATIONS.CREATED_AT.desc())
                        .limit(1)
                        .fetchOne()
        ).map(this::toResponse);
    }

    private InfluencerApplicationResponse toResponse(InfluencerApplicationsRecord r) {
        return new InfluencerApplicationResponse(
                r.getId(),
                r.getProfileId(),
                r.getStatus().getLiteral(),
                r.getIdCardImageUrl(),
                parseJsonMap(r.getSocialProofLinks()),
                r.getFollowerCount(),
                parseJsonList(r.getEventTypes()),
                r.getContentLink(),
                r.getRejectionReason(),
                r.getCanReapplyAt(),
                r.getCreatedAt()
        );
    }

    // JSON serialization helpers for JOOQ JSONB fields
    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize to JSON", e);
        }
    }

    private Map<String, String> parseJsonMap(JSONB jsonb) {
        if (jsonb == null || jsonb.data() == null) return Map.of();
        try {
            return objectMapper.readValue(jsonb.data(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }

    private List<String> parseJsonList(JSONB jsonb) {
        if (jsonb == null || jsonb.data() == null) return List.of();
        try {
            return objectMapper.readValue(jsonb.data(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
