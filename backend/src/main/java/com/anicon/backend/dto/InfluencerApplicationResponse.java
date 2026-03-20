package com.anicon.backend.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Public-facing response for an influencer application.
 * Excludes admin-only fields (reviewedBy, adminNotes).
 */
public record InfluencerApplicationResponse(
    UUID id,
    UUID profileId,
    String status,
    String reason,
    String communityInvolvement,
    Map<String, String> socialProofLinks,
    String rejectionReason,
    OffsetDateTime canReapplyAt,
    OffsetDateTime createdAt
) {}
