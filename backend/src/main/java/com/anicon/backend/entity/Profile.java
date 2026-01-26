package com.anicon.backend.entity;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(unique = true, nullable = false, length = 20)
    private String username;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(columnDefinition = "text")
    private String bio;

    // Roles stored as PostgreSQL array
    @Column(columnDefinition = "user_role[]")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private String[] roles;

    // Creator fields
    @Column(name = "gift_link")
    private String giftLink;

    // Influencer fields
    @Enumerated(EnumType.STRING)
    @Column(name = "influencer_status", columnDefinition = "application_status")
    private ApplicationStatus influencerStatus;

    @Column(name = "influencer_verified_at")
    private OffsetDateTime influencerVerifiedAt;

    // Organizer fields
    @Column(name = "organization_name")
    private String organizationName;

    @Column(name = "is_verified_organizer")
    @Builder.Default
    private Boolean isVerifiedOrganizer = false;

    // Social links stored as JSONB
    @Column(name = "social_links", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Map<String, String> socialLinks = Map.of();

    // In your Profile.java entity class
    @Column(name = "follower_count", nullable = false)
    private Long followerCount = 0L;
    
    @Column(name = "following_count", nullable = false)
    private Long followingCount = 0L;
    
    // Plus getters and setters
    

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
