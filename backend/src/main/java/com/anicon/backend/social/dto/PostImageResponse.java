package com.anicon.backend.social.dto;

import java.util.UUID;

public record PostImageResponse(
    UUID id,
    String imageUrl,
    int displayOrder
) {}
