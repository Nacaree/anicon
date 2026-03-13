package com.anicon.backend.creator;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.creator.dto.PortfolioItemRequest;
import com.anicon.backend.creator.dto.PortfolioItemResponse;
import com.anicon.backend.gen.jooq.enums.UserRole;

import org.jooq.DSLContext;

import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

@Service
public class PortfolioService {

    private final PortfolioItemRepository portfolioItemRepository;
    private final DSLContext dsl;

    public PortfolioService(PortfolioItemRepository portfolioItemRepository, DSLContext dsl) {
        this.portfolioItemRepository = portfolioItemRepository;
        this.dsl = dsl;
    }

    /**
     * Fetch the user's roles from the profiles table.
     * Throws 404 if no profile exists.
     */
    private UserRole[] fetchRoles(UUID userId) {
        UserRole[] roles = dsl.select(PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOne(PROFILES.ROLES);
        if (roles == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found");
        }
        return roles;
    }

    /**
     * Get all portfolio items for a user, ordered by display_order.
     * Public — no auth needed. Returns empty list if user is not a creator.
     */
    public List<PortfolioItemResponse> getPortfolio(UUID userId) {
        // Only return portfolio for creators — non-creators have no portfolio
        UserRole[] roles = dsl.select(PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOne(PROFILES.ROLES);
        if (roles == null || !RoleChecker.canHavePortfolio(roles)) {
            return List.of();
        }

        return portfolioItemRepository.findByUserIdOrderByDisplayOrderAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Add a new portfolio item for the authenticated user.
     * Requires creator role — portfolio is creator-only.
     */
    public PortfolioItemResponse addItem(UUID userId, PortfolioItemRequest request) {
        UserRole[] roles = fetchRoles(userId);
        if (!RoleChecker.canHavePortfolio(roles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Creator role required for portfolio");
        }

        PortfolioItem item = PortfolioItem.builder()
                .userId(userId)
                .imageUrl(request.imageUrl())
                .title(request.title())
                .description(request.description())
                .category(request.category())
                .characterName(request.characterName())
                .seriesName(request.seriesName())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
                .isFeatured(request.isFeatured() != null ? request.isFeatured() : false)
                .build();

        PortfolioItem saved = portfolioItemRepository.save(item);
        return toResponse(saved);
    }

    /**
     * Update a portfolio item. Requires creator role + ownership.
     */
    public PortfolioItemResponse updateItem(UUID userId, UUID itemId, PortfolioItemRequest request) {
        UserRole[] roles = fetchRoles(userId);
        if (!RoleChecker.canHavePortfolio(roles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Creator role required for portfolio");
        }

        PortfolioItem item = portfolioItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Portfolio item not found"));

        // Ownership check — only the item owner can update it
        if (!item.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your portfolio item");
        }

        item.setImageUrl(request.imageUrl());
        item.setTitle(request.title());
        item.setDescription(request.description());
        item.setCategory(request.category());
        item.setCharacterName(request.characterName());
        item.setSeriesName(request.seriesName());
        if (request.displayOrder() != null) item.setDisplayOrder(request.displayOrder());
        if (request.isFeatured() != null) item.setIsFeatured(request.isFeatured());

        PortfolioItem saved = portfolioItemRepository.save(item);
        return toResponse(saved);
    }

    /**
     * Delete a portfolio item. Requires creator role + ownership.
     */
    public void deleteItem(UUID userId, UUID itemId) {
        UserRole[] roles = fetchRoles(userId);
        if (!RoleChecker.canHavePortfolio(roles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Creator role required for portfolio");
        }

        PortfolioItem item = portfolioItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Portfolio item not found"));

        if (!item.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your portfolio item");
        }

        portfolioItemRepository.delete(item);
    }

    private PortfolioItemResponse toResponse(PortfolioItem item) {
        return new PortfolioItemResponse(
                item.getId(),
                item.getUserId(),
                item.getImageUrl(),
                item.getTitle(),
                item.getDescription(),
                item.getCategory(),
                item.getCharacterName(),
                item.getSeriesName(),
                item.getDisplayOrder(),
                item.getIsFeatured(),
                item.getCreatedAt()
        );
    }
}
