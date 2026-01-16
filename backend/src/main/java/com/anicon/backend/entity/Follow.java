package com.anicon.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "follows")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(Follow.FollowId.class)
public class Follow {

    @Id
    @Column(name = "follower_id", columnDefinition = "uuid")
    private UUID followerId;

    @Id
    @Column(name = "following_id", columnDefinition = "uuid")
    private UUID followingId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    // Composite key class
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FollowId implements Serializable {
        private UUID followerId;
        private UUID followingId;
    }
}
