package com.anicon.backend.creator.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PortfolioItemResponse(
    UUID id,
    UUID userId,
    String imageUrl,
    String title,
    String description,
    String category,
    String characterName,
    String seriesName,
    Integer displayOrder,
    Boolean isFeatured,
    OffsetDateTime createdAt
) {}
