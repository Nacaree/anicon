package com.anicon.backend.creator.dto;

import jakarta.validation.constraints.NotBlank;

// Request body for creating/updating a portfolio item
public record PortfolioItemRequest(
    @NotBlank(message = "Image URL is required")
    String imageUrl,
    String title,
    String description,
    String category,
    String characterName,
    String seriesName,
    Integer displayOrder,
    Boolean isFeatured
) {}
