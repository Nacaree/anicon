package com.anicon.backend.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for submitting an influencer (verified host) application.
 * Requires identity verification (ID card), social media proof, and event intent.
 */
public record InfluencerApplicationRequest(
    // Uploaded ID card image URL from Supabase Storage
    @NotBlank(message = "ID card photo is required")
    String idCardImageUrl,

    // Social media links as key-value pairs, e.g. {"Instagram": "https://..."}
    @NotNull(message = "At least one social media link is required")
    @NotEmpty(message = "At least one social media link is required")
    Map<String, String> socialProofLinks,

    // Total followers across all platforms, minimum 100
    @NotNull(message = "Follower count is required")
    @Min(value = 100, message = "Minimum 100 followers required")
    Integer followerCount,

    // Types of events they want to host (e.g. "Watch parties", "Meetups")
    @NotNull(message = "Please select at least one event type")
    @NotEmpty(message = "Please select at least one event type")
    List<String> eventTypes,

    // Optional link to showcase content
    @Size(max = 500)
    String contentLink
) {}
