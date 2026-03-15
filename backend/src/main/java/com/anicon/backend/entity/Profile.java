package com.anicon.backend.entity;

import java.time.OffsetDateTime;
import java.util.List;
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

    @Column(name = "banner_image_url")
    private String bannerImageUrl;

    // Y-position percentage for banner image cropping (0=top, 50=center, 100=bottom)
    @Column(name = "banner_position_y")
    @Builder.Default
    private Integer bannerPositionY = 50;

    @Column(name = "creator_type")
    private String creatorType;

    @Column(name = "commission_status")
    @Builder.Default
    private String commissionStatus = "closed";

    // Commission details: menu items, turnaround, terms, contact method
    @Column(name = "commission_info", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Map<String, Object> commissionInfo = Map.of();

    // Multiple support/tip links (replaces single gift_link)
    @Column(name = "support_links", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private List<Map<String, String>> supportLinks = List.of();

    // Toggle to show/hide support links on the public profile
    @Column(name = "show_support_links")
    @Builder.Default
    private Boolean showSupportLinks = true;

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
