package com.anicon.backend.social;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Junction table for per-user post likes.
 * Composite PK (user_id, post_id) prevents duplicate likes.
 * Same pattern as PortfolioLike.
 */
@Entity
@Table(name = "post_likes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(PostLike.PostLikeId.class)
public class PostLike {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Id
    @Column(name = "post_id", columnDefinition = "uuid")
    private UUID postId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostLikeId implements Serializable {
        private UUID userId;
        private UUID postId;
    }
}
