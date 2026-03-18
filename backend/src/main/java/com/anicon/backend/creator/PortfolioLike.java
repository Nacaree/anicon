package com.anicon.backend.creator;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Junction table entity for per-user portfolio item likes.
 * Composite PK (user_id, portfolio_item_id) prevents duplicate likes.
 * Same pattern as Follow.java.
 */
@Entity
@Table(name = "portfolio_likes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(PortfolioLike.PortfolioLikeId.class)
public class PortfolioLike {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Id
    @Column(name = "portfolio_item_id", columnDefinition = "uuid")
    private UUID portfolioItemId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    // Composite key class for JPA
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PortfolioLikeId implements Serializable {
        private UUID userId;
        private UUID portfolioItemId;
    }
}
