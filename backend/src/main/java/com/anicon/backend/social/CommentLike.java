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
 * Junction table for per-user comment likes.
 * Composite PK (user_id, comment_id) prevents duplicate likes.
 */
@Entity
@Table(name = "comment_likes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(CommentLike.CommentLikeId.class)
public class CommentLike {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Id
    @Column(name = "comment_id", columnDefinition = "uuid")
    private UUID commentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommentLikeId implements Serializable {
        private UUID userId;
        private UUID commentId;
    }
}
