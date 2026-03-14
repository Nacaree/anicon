package com.anicon.backend.creator.dto;

import java.util.List;
import java.util.Map;

// Request body for updating creator-specific profile fields
public record CreatorProfileUpdateRequest(
    String displayName,
    String bio,
    String avatarUrl,
    String bannerImageUrl,
    Integer bannerPositionY,
    String creatorType,
    String commissionStatus,
    Map<String, Object> commissionInfo,
    List<Map<String, String>> supportLinks
) {}
