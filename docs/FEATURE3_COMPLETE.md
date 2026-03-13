# Feature 3: Creator Portfolio with Gifting

> **Deadline:** 2 weeks  
> **Scope:** MVP only — display-focused, no commission request system  
> **Approach:** Extend existing `profiles` table, add `portfolio_items` table, role-based feature gating

---

## Overview

Extend user profiles with role-specific features. Each role gets different sections on their profile based on their purpose in the community.

**Philosophy:** Don't build a marketplace. Build a portfolio showcase with tip jar links. Gate features by role.

---

## Role-Based Feature Matrix

| Feature | Fan | Influencer | Creator | Organizer |
|---------|-----|------------|---------|-----------|
| Basic profile (avatar, bio, followers) | ✅ | ✅ | ✅ | ✅ |
| Banner image | ✅ | ✅ | ✅ | ✅ |
| Social links | ✅ | ✅ | ✅ | ✅ |
| Support/tip links | ✅ | ✅ | ✅ | ❌ |
| Role badge | — | 🏅 | 🎨 | 🎪 |
| Creator type (cosplayer, artist, etc.) | ❌ | ❌ | ✅ | ❌ |
| **Portfolio gallery** | ❌ | ❌ | ✅ | ❌ |
| **Commissions** | ❌ | ✅ | ✅ | ❌ |
| Organization name | ❌ | ❌ | ❌ | ✅ |
| Verified organizer badge | ❌ | ❌ | ❌ | ✅ |

### Permission Logic Summary
```
Portfolio:    creator only
Commissions:  creator OR influencer
Tips:         everyone EXCEPT organizer
Org name:     organizer only
```

---

## Profile Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ══════════════════ TOP SECTION ══════════════════════════ │
│  (Already implemented)                                      │
│                                                             │
│  [Banner]                                                   │
│  [Avatar] Name, @username, followers                        │
│  [Role Badge] [Creator Type Badge] [Commission Status]      │
│  Bio, Social Links, Support Links                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ PORTFOLIO (Creator only - THE DISTINCTION)          │   │
│  │ [img] [img] [img] [img] [img] [img]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ COMMISSIONS (Creator + Influencer)                  │   │
│  │ Sketch .............. $5-10                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ══════════════════ TAB SECTION ═══════════════════════════ │
│  (To be implemented)                                        │
│                                                             │
│  [ Home ]  [ Events ]                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tab content here...                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Current State

### Existing `profiles` Table
```
id                      uuid           PK
username                text           UNIQUE
display_name            text           nullable
avatar_url              text           nullable
bio                     text           nullable
roles                   user_role[]    default '{fan}' — fan, influencer, creator, organizer
gift_link               text           nullable — REPLACE with support_links
social_links            jsonb          default '{}' — ALREADY EXISTS
organization_name       text           nullable — ALREADY EXISTS (for organizer)
is_verified_organizer   boolean        default false — ALREADY EXISTS
follower_count          bigint
following_count         bigint
```

### What's Already Done
- ✅ `social_links` JSONB
- ✅ `roles` with all 4 values
- ✅ `organization_name` for organizers
- ✅ `is_verified_organizer` badge
- ✅ Follow system
- ✅ Profile page UI (top section)

---

## Database Changes

### 1. Add Columns to `profiles`

```sql
-- Run in Supabase SQL Editor

-- Banner/cover image (all roles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- Creator-specific: what type of creator
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_type VARCHAR(50);
-- Values: 'cosplayer', 'digital_artist', 'traditional_artist', 'crafter', 'writer'
-- Only used when role includes 'creator'

-- Commission status (creator + influencer)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_status VARCHAR(20) DEFAULT 'closed';
-- Values: 'open', 'waitlist', 'closed'

-- Commission details (creator + influencer)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_info JSONB DEFAULT '{}';
-- Structure:
-- {
--   "menu": [
--     {"name": "Sketch", "price": "$5-10", "description": "Simple pencil sketch"},
--     {"name": "Full Color", "price": "$20-35", "description": "Colored digital art"}
--   ],
--   "turnaround": "1-2 weeks",
--   "terms": "50% upfront payment required",
--   "contact_method": "DM on Instagram"
-- }

-- Multiple support/tip links (all roles except organizer)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS support_links JSONB DEFAULT '[]';
-- Structure:
-- [
--   {"type": "aba", "label": "ABA.me", "url": "https://aba.me/username"},
--   {"type": "kofi", "label": "Ko-fi", "url": "https://ko-fi.com/username"},
--   {"type": "paypal", "label": "PayPal", "url": "https://paypal.me/username"}
-- ]

-- Migrate existing gift_link data to support_links
UPDATE profiles 
SET support_links = jsonb_build_array(
  jsonb_build_object('type', 'other', 'label', 'Support', 'url', gift_link)
)
WHERE gift_link IS NOT NULL 
  AND gift_link != '' 
  AND (support_links IS NULL OR support_links = '[]'::jsonb);
```

### 2. Create `portfolio_items` Table (Creator Only)

```sql
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Image (required)
    image_url TEXT NOT NULL,
    
    -- Metadata (optional)
    title VARCHAR(200),
    description TEXT,
    category VARCHAR(50),        -- 'cosplay', 'digital_art', 'traditional', 'craft', 'commission_sample'
    character_name VARCHAR(100), -- "Miku Hatsune"
    series_name VARCHAR(100),    -- "Vocaloid"
    
    -- Ordering
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_user_id ON portfolio_items(user_id);
```

### 3. Supabase Storage Bucket

```sql
-- Create portfolio bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view
CREATE POLICY "Portfolio images are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

-- Users upload to their own folder
CREATE POLICY "Users can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users delete their own images
CREATE POLICY "Users can delete own portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Backend Implementation

### File Structure
```
backend/src/main/java/com/anicon/backend/
├── creator/
│   ├── CreatorController.java
│   ├── CreatorService.java
│   ├── PortfolioController.java
│   ├── PortfolioService.java
│   ├── PortfolioItem.java
│   ├── PortfolioItemRepository.java
│   ├── UserEventsController.java        # NEW - for profile tabs
│   ├── UserEventsService.java           # NEW - for profile tabs
│   └── dto/
│       ├── CreatorProfileUpdateRequest.java
│       ├── PortfolioItemRequest.java
│       ├── PortfolioItemResponse.java
│       └── UserEventResponse.java       # NEW
```

### API Endpoints

#### Creator/Portfolio Endpoints

| Method | Path | Auth | Role Required | Description |
|--------|------|------|---------------|-------------|
| `GET` | `/api/profiles/{username}` | Public | — | Returns profile with role-appropriate fields |
| `PATCH` | `/api/creator/profile` | Required | Any | Update banner, support links, social links |
| `PATCH` | `/api/creator/profile/creator` | Required | `creator` | Update creator_type |
| `PATCH` | `/api/creator/profile/commissions` | Required | `creator` OR `influencer` | Update commission info |
| `GET` | `/api/creator/{userId}/portfolio` | Public | — | Get portfolio (only returns if user is creator) |
| `POST` | `/api/creator/portfolio` | Required | `creator` | Add portfolio item |
| `PUT` | `/api/creator/portfolio/{id}` | Required | `creator` | Update portfolio item |
| `DELETE` | `/api/creator/portfolio/{id}` | Required | `creator` | Delete portfolio item |

#### Profile Tab Endpoints (NEW)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users/{userId}/events/going` | Public | Events user RSVP'd or bought tickets for |
| `GET` | `/api/users/{userId}/events/hosted` | Public | Events user created/organized |

### Role Checking Utility

```java
package com.anicon.backend.creator;

import java.util.List;

public class RoleChecker {
    
    public static boolean hasRole(List<String> roles, String role) {
        return roles != null && roles.contains(role);
    }
    
    public static boolean isCreator(List<String> roles) {
        return hasRole(roles, "creator");
    }
    
    public static boolean isInfluencer(List<String> roles) {
        return hasRole(roles, "influencer");
    }
    
    public static boolean isOrganizer(List<String> roles) {
        return hasRole(roles, "organizer");
    }
    
    public static boolean canHaveCommissions(List<String> roles) {
        return isCreator(roles) || isInfluencer(roles);
    }
    
    public static boolean canHavePortfolio(List<String> roles) {
        return isCreator(roles);
    }
    
    public static boolean canHaveSupportLinks(List<String> roles) {
        return !isOrganizer(roles);
    }
    
    public static boolean canHaveGoingEvents(List<String> roles) {
        return !isOrganizer(roles); // Everyone except organizer
    }
    
    public static boolean canHaveHostedEvents(List<String> roles) {
        return isCreator(roles) || isInfluencer(roles) || isOrganizer(roles);
    }
}
```

### CreatorController.java

```java
package com.anicon.backend.creator;

import com.anicon.backend.security.SupabaseUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/creator")
@RequiredArgsConstructor
public class CreatorController {
    
    private final CreatorService creatorService;
    
    /**
     * Update general profile fields (banner, support links).
     * Available to all roles, but support_links ignored for organizers.
     */
    @PatchMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid ProfileUpdateRequest request) {
        
        creatorService.updateProfile(principal.getUserId(), request);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Update creator-specific fields (creator_type).
     * Requires 'creator' role.
     */
    @PatchMapping("/profile/creator")
    public ResponseEntity<?> updateCreatorFields(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid CreatorFieldsRequest request) {
        
        creatorService.updateCreatorFields(principal.getUserId(), request);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Update commission info.
     * Requires 'creator' OR 'influencer' role.
     */
    @PatchMapping("/profile/commissions")
    public ResponseEntity<?> updateCommissions(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid CommissionUpdateRequest request) {
        
        creatorService.updateCommissions(principal.getUserId(), request);
        return ResponseEntity.ok().build();
    }
}
```

### CreatorService.java

```java
package com.anicon.backend.creator;

import com.anicon.backend.exception.ForbiddenException;
import com.anicon.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreatorService {
    
    private final ProfileRepository profileRepository;
    
    @Transactional
    public void updateProfile(UUID userId, ProfileUpdateRequest request) {
        var profile = profileRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Profile not found"));
        
        // Banner available to all
        if (request.bannerImageUrl() != null) {
            profile.setBannerImageUrl(request.bannerImageUrl());
        }
        
        // Support links only for non-organizers
        if (request.supportLinks() != null) {
            if (RoleChecker.canHaveSupportLinks(profile.getRoles())) {
                profile.setSupportLinks(request.supportLinks());
            }
            // Silently ignore for organizers
        }
        
        profileRepository.save(profile);
    }
    
    @Transactional
    public void updateCreatorFields(UUID userId, CreatorFieldsRequest request) {
        var profile = profileRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Profile not found"));
        
        // Must be creator role
        if (!RoleChecker.isCreator(profile.getRoles())) {
            throw new ForbiddenException("Creator role required");
        }
        
        profile.setCreatorType(request.creatorType());
        profileRepository.save(profile);
    }
    
    @Transactional
    public void updateCommissions(UUID userId, CommissionUpdateRequest request) {
        var profile = profileRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Profile not found"));
        
        // Must be creator OR influencer
        if (!RoleChecker.canHaveCommissions(profile.getRoles())) {
            throw new ForbiddenException("Creator or Influencer role required");
        }
        
        profile.setCommissionStatus(request.commissionStatus());
        profile.setCommissionInfo(request.commissionInfo());
        profileRepository.save(profile);
    }
}
```

### PortfolioService.java

```java
package com.anicon.backend.creator;

import com.anicon.backend.exception.ForbiddenException;
import com.anicon.backend.exception.NotFoundException;
import com.anicon.backend.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PortfolioService {
    
    private final PortfolioItemRepository portfolioRepository;
    private final ProfileRepository profileRepository;
    
    /**
     * Get portfolio for a user.
     * Returns empty list if user is not a creator.
     */
    public List<PortfolioItemResponse> getPortfolio(UUID userId) {
        var profile = profileRepository.findById(userId).orElse(null);
        
        // If not a creator, return empty
        if (profile == null || !RoleChecker.canHavePortfolio(profile.getRoles())) {
            return List.of();
        }
        
        return portfolioRepository.findByUserIdOrderByDisplayOrderAsc(userId)
            .stream()
            .map(this::toResponse)
            .toList();
    }
    
    /**
     * Add portfolio item. Requires creator role.
     */
    @Transactional
    public PortfolioItemResponse addItem(UUID userId, PortfolioItemRequest request) {
        var profile = profileRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Profile not found"));
        
        if (!RoleChecker.canHavePortfolio(profile.getRoles())) {
            throw new ForbiddenException("Creator role required");
        }
        
        var item = new PortfolioItem();
        item.setUserId(userId);
        item.setImageUrl(request.imageUrl());
        item.setTitle(request.title());
        item.setDescription(request.description());
        item.setCategory(request.category());
        item.setCharacterName(request.characterName());
        item.setSeriesName(request.seriesName());
        item.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : 0);
        item.setIsFeatured(request.isFeatured() != null ? request.isFeatured() : false);
        
        var saved = portfolioRepository.save(item);
        return toResponse(saved);
    }
    
    /**
     * Delete portfolio item. Must be owner and creator.
     */
    @Transactional
    public void deleteItem(UUID userId, UUID itemId) {
        var profile = profileRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Profile not found"));
        
        if (!RoleChecker.canHavePortfolio(profile.getRoles())) {
            throw new ForbiddenException("Creator role required");
        }
        
        if (!portfolioRepository.existsByIdAndUserId(itemId, userId)) {
            throw new NotFoundException("Portfolio item not found");
        }
        
        portfolioRepository.deleteById(itemId);
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
```

### UserEventsController.java (NEW - Profile Tabs)

```java
package com.anicon.backend.creator;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserEventsController {
    
    private final UserEventsService userEventsService;
    
    /**
     * Get events the user is going to (RSVP'd or bought tickets).
     * Public endpoint - anyone can view.
     */
    @GetMapping("/{userId}/events/going")
    public ResponseEntity<List<UserEventResponse>> getGoingEvents(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(userEventsService.getGoingEvents(userId));
    }
    
    /**
     * Get events the user has hosted/organized.
     * Public endpoint - anyone can view.
     * 
     * @param miniOnly If true, only return mini-events (for influencers)
     */
    @GetMapping("/{userId}/events/hosted")
    public ResponseEntity<List<UserEventResponse>> getHostedEvents(
            @PathVariable UUID userId,
            @RequestParam(required = false, defaultValue = "false") boolean miniOnly) {
        return ResponseEntity.ok(userEventsService.getHostedEvents(userId, miniOnly));
    }
}
```

### UserEventsService.java (NEW - Profile Tabs)

```java
package com.anicon.backend.creator;

import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import static com.anicon.backend.gen.jooq.Tables.*;

@Service
@RequiredArgsConstructor
public class UserEventsService {
    
    private final DSLContext dsl;
    
    /**
     * Get events the user is attending (RSVP or ticket).
     * Combines event_rsvps and tickets tables.
     */
    public List<UserEventResponse> getGoingEvents(UUID userId) {
        // Get event IDs from RSVPs (free events)
        var rsvpEventIds = dsl.select(EVENT_RSVPS.EVENT_ID)
            .from(EVENT_RSVPS)
            .where(EVENT_RSVPS.USER_ID.eq(userId));
        
        // Get event IDs from Tickets (paid events, non-cancelled)
        var ticketEventIds = dsl.select(TICKETS.EVENT_ID)
            .from(TICKETS)
            .where(TICKETS.USER_ID.eq(userId))
            .and(TICKETS.STATUS.ne("cancelled"));
        
        // Combine and fetch events
        return dsl.selectFrom(EVENTS)
            .where(EVENTS.ID.in(rsvpEventIds)
                .or(EVENTS.ID.in(ticketEventIds)))
            .orderBy(EVENTS.EVENT_DATE.desc())
            .fetch(this::toUserEventResponse);
    }
    
    /**
     * Get events hosted by the user.
     * 
     * @param miniOnly If true, only return mini_event type (for influencers)
     */
    public List<UserEventResponse> getHostedEvents(UUID userId, boolean miniOnly) {
        var query = dsl.selectFrom(EVENTS)
            .where(EVENTS.ORGANIZER_ID.eq(userId));
        
        if (miniOnly) {
            query = query.and(EVENTS.EVENT_TYPE.eq("mini_event"));
        }
        
        return query
            .orderBy(EVENTS.EVENT_DATE.desc())
            .fetch(this::toUserEventResponse);
    }
    
    private UserEventResponse toUserEventResponse(/* EventRecord record */) {
        // Map JOOQ record to response DTO
        // Claude Code should check existing event mapping patterns in the codebase
        return new UserEventResponse(
            // ... map fields
        );
    }
}
```

### DTOs

```java
// ProfileUpdateRequest.java — General fields (all roles)
public record ProfileUpdateRequest(
    String bannerImageUrl,
    List<SupportLink> supportLinks
) {
    public record SupportLink(String type, String label, String url) {}
}

// CreatorFieldsRequest.java — Creator-only fields
public record CreatorFieldsRequest(
    String creatorType  // 'cosplayer', 'digital_artist', etc.
) {}

// CommissionUpdateRequest.java — Creator + Influencer
public record CommissionUpdateRequest(
    String commissionStatus,       // 'open', 'waitlist', 'closed'
    CommissionInfo commissionInfo
) {
    public record CommissionInfo(
        List<MenuItem> menu,
        String turnaround,
        String terms,
        String contactMethod
    ) {}
    
    public record MenuItem(String name, String price, String description) {}
}

// PortfolioItemRequest.java
public record PortfolioItemRequest(
    String imageUrl,
    String title,
    String description,
    String category,
    String characterName,
    String seriesName,
    Integer displayOrder,
    Boolean isFeatured
) {}

// PortfolioItemResponse.java
public record PortfolioItemResponse(
    UUID id,
    UUID userId,
    String imageUrl,
    String title,
    String description,
    String category,
    String characterName,
    String seriesName,
    Integer displayOrder,
    Boolean isFeatured,
    OffsetDateTime createdAt
) {}

// UserEventResponse.java — For profile event tabs
public record UserEventResponse(
    UUID id,
    String title,
    String description,
    String coverImageUrl,
    LocalDate eventDate,
    LocalTime eventTime,
    String location,
    String eventType,
    BigDecimal ticketPrice,
    Integer currentAttendance,
    Integer maxCapacity,
    OffsetDateTime createdAt
) {}
```

### Extend Profile Entity

Add to existing `Profile.java`:

```java
// Add these fields to your existing Profile entity

@Column(name = "banner_image_url")
private String bannerImageUrl;

@Column(name = "creator_type")
private String creatorType;

@Column(name = "commission_status")
private String commissionStatus;

@Column(name = "commission_info", columnDefinition = "jsonb")
@JdbcTypeCode(SqlTypes.JSON)
private Map<String, Object> commissionInfo;

@Column(name = "support_links", columnDefinition = "jsonb")
@JdbcTypeCode(SqlTypes.JSON)
private List<Map<String, String>> supportLinks;

// Getters and setters...
```

---

## Frontend Implementation

### File Structure
```
frontend/src/
├── app/
│   ├── profile/
│   │   └── [username]/
│   │       └── page.js                    # MODIFY — add tabs section
│   ├── settings/
│   │   └── creator/
│   │       └── page.js                    # NEW — creator/influencer settings
├── components/
│   ├── profile/
│   │   ├── ProfileHeader.jsx              # EXISTING
│   │   ├── ProfileTabs.jsx                # NEW — tab container
│   │   ├── HomeTab.jsx                    # NEW — placeholder
│   │   ├── EventsTab.jsx                  # NEW — role-based events
│   │   ├── EventsGoingSection.jsx         # NEW — going events grid
│   │   ├── EventsHostedSection.jsx        # NEW — hosted events grid
│   │   ├── RoleBadge.jsx                  # NEW — role badges
│   │   └── OrganizerInfo.jsx              # NEW — org name + verified
│   ├── creator/
│   │   ├── CreatorTypeBadge.jsx
│   │   ├── CommissionStatusBadge.jsx
│   │   ├── PortfolioGrid.jsx
│   │   ├── PortfolioUploadModal.jsx
│   │   ├── PortfolioCard.jsx
│   │   ├── CommissionMenu.jsx
│   │   └── SupportLinksDisplay.jsx
├── lib/
│   ├── api.js                             # ADD creatorApi + userEventsApi
│   └── roles.js                           # NEW — role utilities
```

### lib/roles.js

```javascript
/**
 * Role checking utilities.
 * Mirrors backend RoleChecker.java
 */

export const ROLES = {
  FAN: 'fan',
  INFLUENCER: 'influencer',
  CREATOR: 'creator',
  ORGANIZER: 'organizer',
};

export function hasRole(roles, role) {
  return Array.isArray(roles) && roles.includes(role);
}

export function isCreator(roles) {
  return hasRole(roles, ROLES.CREATOR);
}

export function isInfluencer(roles) {
  return hasRole(roles, ROLES.INFLUENCER);
}

export function isOrganizer(roles) {
  return hasRole(roles, ROLES.ORGANIZER);
}

export function canHavePortfolio(roles) {
  return isCreator(roles);
}

export function canHaveCommissions(roles) {
  return isCreator(roles) || isInfluencer(roles);
}

export function canHaveSupportLinks(roles) {
  return !isOrganizer(roles);
}

export function canHaveGoingEvents(roles) {
  return !isOrganizer(roles); // Everyone except organizer
}

export function canHaveHostedEvents(roles) {
  return isCreator(roles) || isInfluencer(roles) || isOrganizer(roles);
}

export function getPrimaryRole(roles) {
  // Priority: organizer > creator > influencer > fan
  if (isOrganizer(roles)) return ROLES.ORGANIZER;
  if (isCreator(roles)) return ROLES.CREATOR;
  if (isInfluencer(roles)) return ROLES.INFLUENCER;
  return ROLES.FAN;
}
```

### Add to api.js

```javascript
// ============================================
// CREATOR API
// ============================================

export const creatorApi = {
  /**
   * Update general profile fields (banner, support links)
   */
  updateProfile: async (data) => {
    return fetchApi('/api/creator/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update creator-specific fields (creator_type)
   * Requires creator role
   */
  updateCreatorFields: async (data) => {
    return fetchApi('/api/creator/profile/creator', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update commission info
   * Requires creator OR influencer role
   */
  updateCommissions: async (data) => {
    return fetchApi('/api/creator/profile/commissions', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get portfolio for a user (public)
   */
  getPortfolio: async (userId) => {
    return fetchApi(`/api/creator/${userId}/portfolio`, { noAuth: true });
  },

  /**
   * Add portfolio item (requires creator role)
   */
  addPortfolioItem: async (data) => {
    return fetchApi('/api/creator/portfolio', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete portfolio item
   */
  deletePortfolioItem: async (id) => {
    return fetchApi(`/api/creator/portfolio/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Upload image to Supabase Storage
   */
  uploadImage: async (file, userId) => {
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
    const path = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from('portfolio')
      .upload(path, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('portfolio')
      .getPublicUrl(path);

    return publicUrl;
  },
};

// ============================================
// USER EVENTS API (Profile Tabs)
// ============================================

export const userEventsApi = {
  /**
   * Get events user is going to (RSVP + tickets)
   */
  getGoingEvents: async (userId) => {
    return fetchApi(`/api/users/${userId}/events/going`, { noAuth: true });
  },

  /**
   * Get events user has hosted
   * @param miniOnly - If true, only return mini-events (for influencers)
   */
  getHostedEvents: async (userId, miniOnly = false) => {
    const query = miniOnly ? '?miniOnly=true' : '';
    return fetchApi(`/api/users/${userId}/events/hosted${query}`, { noAuth: true });
  },
};
```

---

## Profile Tabs Implementation

### ProfileTabs.jsx

```jsx
'use client';

import { useState } from 'react';
import { HomeTab } from './HomeTab';
import { EventsTab } from './EventsTab';

export function ProfileTabs({ profile, isOwner }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="mt-8">
      {/* Tab Headers */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'home'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Home
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'events'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Events
        </button>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {activeTab === 'home' && <HomeTab profile={profile} isOwner={isOwner} />}
        {activeTab === 'events' && <EventsTab profile={profile} isOwner={isOwner} />}
      </div>
    </div>
  );
}
```

### HomeTab.jsx (Placeholder)

```jsx
export function HomeTab({ profile, isOwner }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">📝</div>
      <h3 className="text-lg font-medium mb-2">Posts coming soon</h3>
      <p className="text-muted-foreground">
        Share updates with your followers
      </p>
    </div>
  );
}
```

### EventsTab.jsx (Role-Based Logic)

```jsx
'use client';

import { useState } from 'react';
import { isOrganizer, isInfluencer, isCreator, canHaveGoingEvents, canHaveHostedEvents } from '@/lib/roles';
import { EventsGoingSection } from './EventsGoingSection';
import { EventsHostedSection } from './EventsHostedSection';

export function EventsTab({ profile }) {
  const roles = profile.roles || [];
  const showGoing = canHaveGoingEvents(roles);
  const showHosted = canHaveHostedEvents(roles);

  // Organizer: Only hosted, no tabs needed
  if (isOrganizer(roles) && !isCreator(roles)) {
    return <EventsHostedSection userId={profile.id} miniOnly={false} />;
  }

  // Fan: Only going, no tabs needed
  if (!showHosted) {
    return <EventsGoingSection userId={profile.id} />;
  }

  // Influencer/Creator: Show sub-tabs
  const [subTab, setSubTab] = useState('going');
  
  // Influencer (without creator role) can only host mini-events
  const miniOnly = isInfluencer(roles) && !isCreator(roles);

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSubTab('going')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            subTab === 'going'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Going
        </button>
        <button
          onClick={() => setSubTab('hosted')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            subTab === 'hosted'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Hosted
        </button>
      </div>

      {/* Content */}
      {subTab === 'going' && <EventsGoingSection userId={profile.id} />}
      {subTab === 'hosted' && <EventsHostedSection userId={profile.id} miniOnly={miniOnly} />}
    </div>
  );
}
```

### EventsGoingSection.jsx

```jsx
'use client';

import { useState, useEffect } from 'react';
import { userEventsApi } from '@/lib/api';
import { EventCard } from '@/components/events/EventCard'; // Reuse existing component

export function EventsGoingSection({ userId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userEventsApi.getGoingEvents(userId)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-3xl mb-2">🎫</div>
        <p>No events yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### EventsHostedSection.jsx

```jsx
'use client';

import { useState, useEffect } from 'react';
import { userEventsApi } from '@/lib/api';
import { EventCard } from '@/components/events/EventCard';

export function EventsHostedSection({ userId, miniOnly = false }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userEventsApi.getHostedEvents(userId, miniOnly)
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, miniOnly]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-3xl mb-2">🎪</div>
        <p>No events hosted yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

---

## Profile Tabs Summary by Role

### Fan
```
┌─────────────────────────────────────────┐
│ [ Home ]  [ Events ]                    │
├─────────────────────────────────────────┤
│ Events Tab:                             │
│ (No sub-tabs)                           │
│                                         │
│ Going (3)                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Event 1 │ │ Event 2 │ │ Event 3 │    │
│ │ RSVP'd  │ │ Ticket  │ │ RSVP'd  │    │
│ └─────────┘ └─────────┘ └─────────┘    │
└─────────────────────────────────────────┘
```

### Influencer
```
┌─────────────────────────────────────────┐
│ [ Home ]  [ Events ]                    │
├─────────────────────────────────────────┤
│ Events Tab:                             │
│ ( Going )  ( Hosted )  ← sub-tabs       │
│                                         │
│ Going: RSVPs + Tickets                  │
│ Hosted: Mini-events only                │
└─────────────────────────────────────────┘
```

### Creator
```
┌─────────────────────────────────────────┐
│ [ Home ]  [ Events ]                    │
├─────────────────────────────────────────┤
│ Events Tab:                             │
│ ( Going )  ( Hosted )  ← sub-tabs       │
│                                         │
│ Going: RSVPs + Tickets                  │
│ Hosted: All event types                 │
└─────────────────────────────────────────┘
```

### Organizer
```
┌─────────────────────────────────────────┐
│ [ Home ]  [ Events ]                    │
├─────────────────────────────────────────┤
│ Events Tab:                             │
│ (No sub-tabs)                           │
│                                         │
│ Hosted (5)                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │ Event 1 │ │ Event 2 │ │ Event 3 │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ (No "Going" - organizers run events)    │
└─────────────────────────────────────────┘
```

---

## Sprint Plan (2 Weeks)

### Week 1: Backend + Database

| Day | Tasks | Hours |
|-----|-------|-------|
| **1** | Run SQL migrations (add profile columns) | 1h |
| **1** | Create portfolio_items table | 0.5h |
| **1** | Set up Supabase Storage bucket | 0.5h |
| **1** | Add fields to Profile entity | 2h |
| **2** | Create `RoleChecker` utility | 1h |
| **2** | Create `PortfolioItem` entity + repository | 2h |
| **2** | Create `PortfolioService` + `PortfolioController` | 2h |
| **3** | Create `CreatorService` + `CreatorController` | 3h |
| **3** | Extend ProfileService to return new fields | 2h |
| **4** | Create `UserEventsController` + `UserEventsService` | 3h |
| **4** | Test all endpoints | 2h |
| **5** | Buffer / bug fixes | 4h |

### Week 2: Frontend

| Day | Tasks | Hours |
|-----|-------|-------|
| **1** | Create `lib/roles.js` utilities | 1h |
| **1** | Add `creatorApi` + `userEventsApi` to api.js | 1.5h |
| **1** | Create role badges (`RoleBadge`, `CreatorTypeBadge`, `CommissionStatusBadge`) | 1.5h |
| **2** | Create `PortfolioGrid`, `PortfolioCard`, `PortfolioUploadModal` | 4h |
| **3** | Create `CommissionMenu`, `SupportLinksDisplay` | 2h |
| **3** | Create `ProfileTabs`, `HomeTab` (placeholder) | 2h |
| **4** | Create `EventsTab` with role logic | 2h |
| **4** | Create `EventsGoingSection`, `EventsHostedSection` | 2h |
| **5** | Integrate all into profile page | 3h |
| **5** | Create `/settings/creator` page | 2h |
| **6** | Testing, responsive, polish | 4h |
| **7** | Buffer, deploy | 4h |

---

## Testing Checklist

### Backend
- [ ] Fan cannot access `/api/creator/profile/creator`
- [ ] Fan cannot access `/api/creator/profile/commissions`
- [ ] Fan cannot POST to `/api/creator/portfolio`
- [ ] Influencer CAN update commissions
- [ ] Influencer CANNOT add portfolio items
- [ ] Creator CAN do everything
- [ ] Organizer cannot set support_links
- [ ] `GET /api/users/{id}/events/going` returns correct events
- [ ] `GET /api/users/{id}/events/hosted` returns correct events
- [ ] `GET /api/users/{id}/events/hosted?miniOnly=true` filters correctly

### Frontend
- [ ] Fan profile shows Going tab only (no sub-tabs)
- [ ] Influencer profile shows Going + Hosted tabs (mini-events only in Hosted)
- [ ] Creator profile shows Going + Hosted tabs (all events in Hosted)
- [ ] Organizer profile shows Hosted only (no Going tab)
- [ ] Portfolio section shows for Creator only
- [ ] Commission section shows for Creator + Influencer
- [ ] Support links hidden for Organizer
- [ ] Home tab shows placeholder
- [ ] Role badges display correctly
- [ ] Mobile responsive

---

## Post-MVP Features

- [ ] Posts system (Home tab)
- [ ] Commission request system
- [ ] Lightbox for portfolio
- [ ] Drag-to-reorder portfolio
- [ ] Event analytics for organizers
