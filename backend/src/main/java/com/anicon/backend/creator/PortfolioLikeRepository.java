package com.anicon.backend.creator;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PortfolioLikeRepository extends JpaRepository<PortfolioLike, PortfolioLike.PortfolioLikeId> {

    boolean existsByUserIdAndPortfolioItemId(UUID userId, UUID portfolioItemId);

    void deleteByUserIdAndPortfolioItemId(UUID userId, UUID portfolioItemId);

    /**
     * Batch-fetch which portfolio items a user has liked from a given set.
     * Used to populate likedByCurrentUser on the response without N+1 queries.
     */
    @Query("SELECT pl.portfolioItemId FROM PortfolioLike pl WHERE pl.userId = :userId AND pl.portfolioItemId IN :itemIds")
    List<UUID> findLikedItemIds(UUID userId, List<UUID> itemIds);
}
