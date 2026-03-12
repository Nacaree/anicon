package com.anicon.backend.creator;

import java.util.UUID;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.creator.dto.CreatorProfileUpdateRequest;
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
     * Any user can set these — setting creatorType effectively "enables" creator mode.
     * Evicts the profile cache so subsequent GETs return fresh data.
     */
    @CacheEvict(value = "profiles", key = "#userId")
    public void updateCreatorProfile(UUID userId, CreatorProfileUpdateRequest request) {
        try {
            int updated = dsl.update(PROFILES)
                    .set(PROFILES.DISPLAY_NAME, request.displayName())
                    .set(PROFILES.BIO, request.bio())
                    .set(PROFILES.BANNER_IMAGE_URL, request.bannerImageUrl())
                    .set(PROFILES.CREATOR_TYPE, request.creatorType())
                    .set(PROFILES.COMMISSION_STATUS, request.commissionStatus())
                    .set(PROFILES.COMMISSION_INFO,
                            request.commissionInfo() != null
                                    ? JSONB.jsonb(objectMapper.writeValueAsString(request.commissionInfo()))
                                    : JSONB.jsonb("{}"))
                    .set(PROFILES.SUPPORT_LINKS,
                            request.supportLinks() != null
                                    ? JSONB.jsonb(objectMapper.writeValueAsString(request.supportLinks()))
                                    : JSONB.jsonb("[]"))
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
