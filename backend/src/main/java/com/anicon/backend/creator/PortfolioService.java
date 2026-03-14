package com.anicon.backend.creator;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.anicon.backend.creator.dto.PortfolioItemRequest;
import com.anicon.backend.creator.dto.PortfolioItemResponse;
import com.anicon.backend.gen.jooq.enums.UserRole;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;

import static com.anicon.backend.gen.jooq.tables.Profiles.PROFILES;

@Service
public class PortfolioService {

    private final PortfolioItemRepository portfolioItemRepository;
    private final PortfolioLikeRepository portfolioLikeRepository;
    private final DSLContext dsl;

    public PortfolioService(PortfolioItemRepository portfolioItemRepository,
                            PortfolioLikeRepository portfolioLikeRepository,
                            DSLContext dsl) {
        this.portfolioItemRepository = portfolioItemRepository;
        this.portfolioLikeRepository = portfolioLikeRepository;
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
     * When currentUserId is provided, populates likedByCurrentUser on each item.
     */
    public List<PortfolioItemResponse> getPortfolio(UUID userId, UUID currentUserId) {
        // Only return portfolio for creators — non-creators have no portfolio
        UserRole[] roles = dsl.select(PROFILES.ROLES)
                .from(PROFILES)
                .where(PROFILES.ID.eq(userId))
                .fetchOne(PROFILES.ROLES);
        if (roles == null || !RoleChecker.canHavePortfolio(roles)) {
            return List.of();
        }

        List<PortfolioItem> items = portfolioItemRepository.findByUserIdOrderByDisplayOrderAsc(userId);

        // Batch-fetch which items the current user has liked (avoids N+1)
        Set<UUID> likedIds;
        if (currentUserId != null && !items.isEmpty()) {
            List<UUID> itemIds = items.stream().map(PortfolioItem::getId).toList();
            likedIds = new HashSet<>(portfolioLikeRepository.findLikedItemIds(currentUserId, itemIds));
        } else {
            likedIds = Collections.emptySet();
        }

        return items.stream()
                .map(item -> toResponse(item, likedIds.contains(item.getId())))
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
        return toResponse(saved, false);
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
        return toResponse(saved, false);
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

    /**
     * Like a portfolio item. Idempotent — liking twice is a no-op.
     * Atomically increments the denormalized like_count.
     */
    @Transactional
    public void likeItem(UUID userId, UUID itemId) {
        PortfolioItem item = portfolioItemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Portfolio item not found"));

        if (portfolioLikeRepository.existsByUserIdAndPortfolioItemId(userId, itemId)) {
            return; // Already liked — idempotent
        }

        portfolioLikeRepository.save(PortfolioLike.builder()
                .userId(userId)
                .portfolioItemId(itemId)
                .build());

        // Atomic increment via JOOQ (uses plain SQL field reference since JOOQ types may not have like_count yet)
        dsl.update(DSL.table("portfolio_items"))
                .set(DSL.field("like_count", Long.class), DSL.field("like_count", Long.class).plus(1))
                .where(DSL.field("id", UUID.class).eq(itemId))
                .execute();
    }

    /**
     * Unlike a portfolio item. Idempotent — unliking when not liked is a no-op.
     * Atomically decrements the denormalized like_count (floor at 0).
     */
    @Transactional
    public void unlikeItem(UUID userId, UUID itemId) {
        if (!portfolioLikeRepository.existsByUserIdAndPortfolioItemId(userId, itemId)) {
            return; // Not liked — idempotent
        }

        portfolioLikeRepository.deleteByUserIdAndPortfolioItemId(userId, itemId);

        // Atomic decrement via JOOQ, floored at 0 with GREATEST
        dsl.update(DSL.table("portfolio_items"))
                .set(DSL.field("like_count", Long.class),
                        DSL.greatest(DSL.field("like_count", Long.class).minus(1), DSL.val(0L)))
                .where(DSL.field("id", UUID.class).eq(itemId))
                .execute();
    }

    private PortfolioItemResponse toResponse(PortfolioItem item, boolean likedByCurrentUser) {
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
                item.getLikeCount() != null ? item.getLikeCount() : 0L,
                likedByCurrentUser,
                item.getCreatedAt()
        );
    }
}
