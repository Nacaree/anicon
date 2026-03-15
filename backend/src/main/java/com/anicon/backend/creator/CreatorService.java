package com.anicon.backend.creator;

import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.creator.dto.CreatorProfileUpdateRequest;
import com.anicon.backend.gen.jooq.enums.UserRole;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

/**
 * Service for updating creator-specific profile fields.
 * Uses JOOQ for targeted column updates (same pattern as ProfileService reads).
 */
@Service
public class CreatorService {

    private final DSLContext dsl;
    private final ObjectMapper objectMapper;

    public CreatorService(DSLContext dsl, ObjectMapper objectMapper) {
        this.dsl = dsl;
        this.objectMapper = objectMapper;
    }

    /**
     * Update creator-specific fields on the profile.
     * Role-gated: creatorType requires creator role, commission fields require
     * creator or influencer, support links are blocked for organizers.
     * Evicts the profile cache so subsequent GETs return fresh data.
     */
    @CacheEvict(value = "profiles", key = "#userId")
    public void updateCreatorProfile(UUID userId, CreatorProfileUpdateRequest request) {
        // Fetch the user's roles to enforce permission checks
        UserRole[] roles = dsl.select(PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOne(PROFILES.ROLES);

        if (roles == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
        }

        try {
            var update = dsl.update(PROFILES)
                    // General fields — any role can update these
                    .set(PROFILES.DISPLAY_NAME, request.displayName())
                    .set(PROFILES.BIO, request.bio())
                    .set(PROFILES.AVATAR_URL, request.avatarUrl())
                    .set(PROFILES.BANNER_IMAGE_URL, request.bannerImageUrl())
                    .set(PROFILES.BANNER_POSITION_Y, request.bannerPositionY() != null ? request.bannerPositionY() : 50);

            // Creator type — only creators can set this
            if (RoleChecker.isCreator(roles)) {
                update = update.set(PROFILES.CREATOR_TYPE, request.creatorType());
            }

            // Commission fields — creators and influencers only
            if (RoleChecker.canHaveCommissions(roles)) {
                update = update
                        .set(PROFILES.COMMISSION_STATUS, request.commissionStatus())
                        .set(PROFILES.COMMISSION_INFO,
                                request.commissionInfo() != null
                                        ? JSONB.jsonb(objectMapper.writeValueAsString(request.commissionInfo()))
                                        : JSONB.jsonb("{}"));
            }

            // Support links — everyone except pure organizers
            if (RoleChecker.canHaveSupportLinks(roles)) {
                update = update.set(PROFILES.SUPPORT_LINKS,
                        request.supportLinks() != null
                                ? JSONB.jsonb(objectMapper.writeValueAsString(request.supportLinks()))
                                : JSONB.jsonb("[]"))
                        // Toggle to show/hide support links on the public profile
                        .set(PROFILES.SHOW_SUPPORT_LINKS,
                                request.showSupportLinks() != null ? request.showSupportLinks() : true);
            }

            int updated = update
                    .where(PROFILES.ID.eq(userId))
                    .execute();

            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
            }
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON in request body");
        }
    }
}
