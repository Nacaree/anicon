package com.anicon.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "influencer_applications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InfluencerApplication {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "profile_id", nullable = false, columnDefinition = "uuid")
    private UUID profileId;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "application_status")
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    // Application data
    @Column(nullable = false, columnDefinition = "text")
    private String reason;

    @Column(name = "community_involvement", columnDefinition = "text")
    private String communityInvolvement;

    @Column(name = "follower_count")
    @Builder.Default
    private Integer followerCount = 0;

    @Column(name = "social_proof_links", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Map<String, String> socialProofLinks = Map.of();

    // Review data
    @Column(name = "reviewed_by", columnDefinition = "uuid")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "admin_notes", columnDefinition = "text")
    private String adminNotes;

    // Reapply logic
    @Column(name = "can_reapply_at")
    private OffsetDateTime canReapplyAt;

    // Metadata
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
