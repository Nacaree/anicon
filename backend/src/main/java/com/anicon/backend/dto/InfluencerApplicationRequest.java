package com.anicon.backend.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for submitting an influencer (verified host) application.
 * Only reason is required — other fields provide supplementary context for review.
 */
public record InfluencerApplicationRequest(
    @NotBlank(message = "Please tell us why you want to host events")
    @Size(max = 1000)
    String reason,

    @Size(max = 1000)
    String communityInvolvement,

    // Social media links as key-value pairs, e.g. {"instagram": "https://..."}
    Map<String, String> socialProofLinks
) {}
