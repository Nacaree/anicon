# Feature 3: Creator Portfolio with Gifting

> **Deadline:** 2 weeks  
> **Scope:** MVP only — display-focused, no commission request system  
> **Approach:** Extend existing `profiles` table, add one new `portfolio_items` table

---

## Overview

Extend user profiles to support creators (cosplayers, artists, crafters). Creators can showcase portfolio work, display commission pricing, and provide multiple support/payment links. All transactions happen off-platform via external links.

**Philosophy:** Don't build a marketplace. Build a portfolio showcase with tip jar links.

---

## Current State

### Existing `profiles` Table (Relevant Columns)
```
id                 uuid           PK
username           text           UNIQUE
display_name       text           nullable
avatar_url         text           nullable
bio                text           nullable
roles              user_role[]    default '{fan}' — includes 'creator' value
gift_link          text           nullable — SINGLE link, will be replaced
social_links       jsonb          default '{}' — already exists!
follower_count     bigint         denormalized
following_count    bigint         denormalized
```

### What's Already Working
- ✅ `social_links` JSONB — no changes needed
- ✅ `roles` includes `creator` — permission gating ready
- ✅ `avatar_url` — working
- ✅ Follow system — working
- ✅ Profile page UI — exists (see reference design)

---

## Database Changes

### 1. Add Columns to `profiles`

```sql
-- Run in Supabase SQL Editor

-- Banner/cover image for profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_image_url TEXT;

-- What type of creator (null = not a creator, just use roles for gating)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_type VARCHAR(50);
-- Values: 'cosplayer', 'digital_artist', 'traditional_artist', 'crafter', 'writer'

-- Commission availability status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_status VARCHAR(20) DEFAULT 'closed';
-- Values: 'open', 'waitlist', 'closed'

-- Commission details (menu, terms, turnaround, contact method)
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

-- Multiple support/tip links (replaces single gift_link)
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
WHERE gift_link IS NOT NULL AND gift_link != '';

-- Optional: Drop gift_link after migration (or keep for backwards compat)
-- ALTER TABLE profiles DROP COLUMN gift_link;
```

### 2. Create `portfolio_items` Table

```sql
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Image (required)
    image_url TEXT NOT NULL,
    
    -- Metadata (all optional)
    title VARCHAR(200),
    description TEXT,
    category VARCHAR(50),        -- 'cosplay', 'digital_art', 'traditional', 'craft', 'commission_sample'
    character_name VARCHAR(100), -- For cosplay: "Miku Hatsune"
    series_name VARCHAR(100),    -- "Vocaloid"
    
    -- Ordering & display
    display_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching user's portfolio
CREATE INDEX idx_portfolio_user_id ON portfolio_items(user_id);
```

### 3. Supabase Storage Bucket (for portfolio images)

```sql
-- Create portfolio bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view portfolio images
CREATE POLICY "Portfolio images are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

-- Users can upload to their own folder (folder name = user id)
CREATE POLICY "Users can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own images
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
├── creator/                              # NEW PACKAGE
│   ├── CreatorController.java
│   ├── CreatorService.java
│   ├── PortfolioController.java
│   ├── PortfolioService.java
│   ├── PortfolioItem.java               # JPA Entity
│   ├── PortfolioItemRepository.java     # Spring Data JPA
│   └── dto/
│       ├── CreatorProfileUpdateRequest.java
│       ├── PortfolioItemRequest.java
│       └── PortfolioItemResponse.java
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/profiles/{username}` | Public | **EXISTING** — extend response with new fields |
| `PATCH` | `/api/creator/profile` | Required | Update creator fields (banner, type, commission info, support links) |
| `GET` | `/api/creator/{userId}/portfolio` | Public | Get user's portfolio items |
| `POST` | `/api/creator/portfolio` | Required | Add portfolio item |
| `PUT` | `/api/creator/portfolio/{id}` | Required | Update portfolio item |
| `DELETE` | `/api/creator/portfolio/{id}` | Required | Delete portfolio item |

### PortfolioItem.java (JPA Entity)

```java
package com.anicon.backend.creator;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "portfolio_items")
public class PortfolioItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    
    @Column(name = "image_url", nullable = false)
    private String imageUrl;
    
    private String title;
    
    private String description;
    
    private String category;
    
    @Column(name = "character_name")
    private String characterName;
    
    @Column(name = "series_name")
    private String seriesName;
    
    @Column(name = "display_order")
    private Integer displayOrder = 0;
    
    @Column(name = "is_featured")
    private Boolean isFeatured = false;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();
    
    // Getters and setters...
}
```

### PortfolioItemRepository.java

```java
package com.anicon.backend.creator;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, UUID> {
    
    List<PortfolioItem> findByUserIdOrderByDisplayOrderAsc(UUID userId);
    
    void deleteByIdAndUserId(UUID id, UUID userId);
    
    boolean existsByIdAndUserId(UUID id, UUID userId);
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
     * Update creator-specific profile fields.
     * Works for any user — doesn't require 'creator' role.
     * Setting creator_type effectively "enables" creator mode.
     */
    @PatchMapping("/profile")
    public ResponseEntity<?> updateCreatorProfile(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid CreatorProfileUpdateRequest request) {
        
        creatorService.updateCreatorProfile(principal.getUserId(), request);
        return ResponseEntity.ok().build();
    }
}
```

### PortfolioController.java

```java
package com.anicon.backend.creator;

import com.anicon.backend.security.SupabaseUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/creator")
@RequiredArgsConstructor
public class PortfolioController {
    
    private final PortfolioService portfolioService;
    
    /**
     * Get portfolio items for any user (public).
     */
    @GetMapping("/{userId}/portfolio")
    public ResponseEntity<List<PortfolioItemResponse>> getPortfolio(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(portfolioService.getPortfolio(userId));
    }
    
    /**
     * Add new portfolio item (authenticated user only).
     */
    @PostMapping("/portfolio")
    public ResponseEntity<PortfolioItemResponse> addPortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestBody @Valid PortfolioItemRequest request) {
        
        PortfolioItemResponse response = portfolioService.addItem(principal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    /**
     * Update portfolio item (owner only).
     */
    @PutMapping("/portfolio/{id}")
    public ResponseEntity<PortfolioItemResponse> updatePortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody @Valid PortfolioItemRequest request) {
        
        PortfolioItemResponse response = portfolioService.updateItem(principal.getUserId(), id, request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Delete portfolio item (owner only).
     */
    @DeleteMapping("/portfolio/{id}")
    public ResponseEntity<Void> deletePortfolioItem(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID id) {
        
        portfolioService.deleteItem(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
```

### DTOs

```java
// CreatorProfileUpdateRequest.java
public record CreatorProfileUpdateRequest(
    String bannerImageUrl,
    String creatorType,           // 'cosplayer', 'digital_artist', etc.
    String commissionStatus,      // 'open', 'waitlist', 'closed'
    CommissionInfo commissionInfo,
    List<SupportLink> supportLinks
) {
    public record CommissionInfo(
        List<MenuItem> menu,
        String turnaround,
        String terms,
        String contactMethod
    ) {}
    
    public record MenuItem(String name, String price, String description) {}
    public record SupportLink(String type, String label, String url) {}
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
```

### Extend Existing Profile Entity

Add these fields to your existing `Profile` JPA entity:

```java
// In Profile.java entity, add:

@Column(name = "banner_image_url")
private String bannerImageUrl;

@Column(name = "creator_type")
private String creatorType;

@Column(name = "commission_status")
private String commissionStatus;

@Column(name = "commission_info", columnDefinition = "jsonb")
@Convert(converter = JsonbConverter.class)  // Or use @Type with Hibernate
private Map<String, Object> commissionInfo;

@Column(name = "support_links", columnDefinition = "jsonb")
@Convert(converter = JsonbListConverter.class)
private List<Map<String, String>> supportLinks;
```

---

## Frontend Implementation

### File Structure
```
frontend/src/
├── app/
│   ├── profile/
│   │   └── [username]/
│   │       └── page.js                    # MODIFY — add creator sections
│   ├── settings/
│   │   ├── page.js                        # Existing settings
│   │   └── creator/
│   │       └── page.js                    # NEW — creator settings
├── components/
│   ├── creator/
│   │   ├── CreatorTypeBadge.jsx           # "🎨 Digital Artist"
│   │   ├── CommissionStatusBadge.jsx      # "🟢 Open"
│   │   ├── PortfolioGrid.jsx              # Gallery grid
│   │   ├── PortfolioUploadModal.jsx       # Upload dialog
│   │   ├── PortfolioCard.jsx              # Single gallery item
│   │   ├── CommissionMenu.jsx             # Price list display
│   │   └── SupportLinksDisplay.jsx        # Multiple tip jar buttons
│   ├── profile/
│   │   └── ProfileHeader.jsx              # MODIFY — add banner, badges
├── lib/
│   └── api.js                             # ADD creatorApi functions
```

### Add to api.js

```javascript
// ============================================
// CREATOR API
// ============================================

export const creatorApi = {
  /**
   * Update creator profile fields
   */
  updateCreatorProfile: async (data) => {
    return fetchApi('/api/creator/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get portfolio items for a user (public)
   */
  getPortfolio: async (userId) => {
    return fetchApi(`/api/creator/${userId}/portfolio`, { noAuth: true });
  },

  /**
   * Add new portfolio item
   */
  addPortfolioItem: async (data) => {
    return fetchApi('/api/creator/portfolio', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update portfolio item
   */
  updatePortfolioItem: async (id, data) => {
    return fetchApi(`/api/creator/portfolio/${id}`, {
      method: 'PUT',
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
   * Upload image to Supabase Storage, returns public URL
   */
  uploadPortfolioImage: async (file, userId) => {
    const supabase = createClient();
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = `${userId}/${filename}`;

    const { data, error } = await supabase.storage
      .from('portfolio')
      .upload(path, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('portfolio')
      .getPublicUrl(path);

    return publicUrl;
  },

  /**
   * Upload banner image to Supabase Storage
   */
  uploadBannerImage: async (file, userId) => {
    const supabase = createClient();
    const filename = `banner-${Date.now()}.${file.name.split('.').pop()}`;
    const path = `${userId}/${filename}`;

    const { data, error } = await supabase.storage
      .from('portfolio')  // Reuse same bucket
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('portfolio')
      .getPublicUrl(path);

    return publicUrl;
  },
};
```

### Component: PortfolioGrid.jsx

```jsx
'use client';

import { useState, useEffect } from 'react';
import { creatorApi } from '@/lib/api';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioUploadModal } from './PortfolioUploadModal';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PortfolioGrid({ userId, isOwner = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const loadPortfolio = async () => {
    try {
      const data = await creatorApi.getPortfolio(userId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [userId]);

  const handleDelete = async (id) => {
    try {
      await creatorApi.deletePortfolioItem(id);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    loadPortfolio();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header with Add button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Portfolio</h2>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        )}
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {isOwner ? 'Add your first portfolio item!' : 'No portfolio items yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <PortfolioCard
              key={item.id}
              item={item}
              isOwner={isOwner}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <PortfolioUploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
```

### Component: CommissionMenu.jsx

```jsx
export function CommissionMenu({ info, status }) {
  if (!info?.menu?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Commissions</h2>
        <CommissionStatusBadge status={status} />
      </div>

      <div className="border rounded-lg divide-y">
        {info.menu.map((item, i) => (
          <div key={i} className="flex justify-between p-4">
            <div>
              <p className="font-medium">{item.name}</p>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
            <p className="font-semibold text-primary whitespace-nowrap">{item.price}</p>
          </div>
        ))}
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        {info.turnaround && <p>⏱️ Turnaround: {info.turnaround}</p>}
        {info.contactMethod && <p>📩 {info.contactMethod}</p>}
      </div>

      {info.terms && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">View Terms</summary>
          <p className="mt-2 p-3 bg-muted rounded">{info.terms}</p>
        </details>
      )}
    </div>
  );
}

function CommissionStatusBadge({ status }) {
  const config = {
    open: { label: 'Open', color: 'bg-green-500' },
    waitlist: { label: 'Waitlist', color: 'bg-yellow-500' },
    closed: { label: 'Closed', color: 'bg-red-500' },
  };

  const { label, color } = config[status] || config.closed;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs text-white ${color}`}>
      <span className="w-1.5 h-1.5 bg-white rounded-full" />
      {label}
    </span>
  );
}
```

### Component: SupportLinksDisplay.jsx

```jsx
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUPPORT_ICONS = {
  aba: '🏦',
  wing: '📱',
  kofi: '☕',
  paypal: '💳',
  patreon: '🎨',
  other: '💰',
};

export function SupportLinksDisplay({ links }) {
  if (!links?.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Support</h2>
      <div className="flex flex-wrap gap-2">
        {links.map((link, i) => {
          const icon = SUPPORT_ICONS[link.type] || SUPPORT_ICONS.other;

          return (
            <Button
              key={i}
              variant="outline"
              size="sm"
              asChild
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <span className="mr-2">{icon}</span>
                {link.label}
                <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

### Component: CreatorTypeBadge.jsx

```jsx
const CREATOR_TYPES = {
  cosplayer: { label: 'Cosplayer', icon: '🎭' },
  digital_artist: { label: 'Digital Artist', icon: '🎨' },
  traditional_artist: { label: 'Traditional Artist', icon: '🖌️' },
  crafter: { label: 'Crafter', icon: '✂️' },
  writer: { label: 'Writer', icon: '✍️' },
};

export function CreatorTypeBadge({ type }) {
  if (!type) return null;

  const config = CREATOR_TYPES[type] || { label: type, icon: '🎨' };

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}
```

---

## Profile Page Integration

Modify existing profile page to include creator sections:

```jsx
// In profile/[username]/page.js or ProfileContent component

{/* Existing profile header... */}
<ProfileHeader profile={profile} />

{/* NEW: Creator Badges (if creator) */}
{profile.creatorType && (
  <div className="flex items-center gap-2 mt-2">
    <CreatorTypeBadge type={profile.creatorType} />
    <CommissionStatusBadge status={profile.commissionStatus} />
  </div>
)}

{/* Existing bio, location, etc... */}

{/* NEW: Support Links (replaces single gift_link) */}
{profile.supportLinks?.length > 0 && (
  <SupportLinksDisplay links={profile.supportLinks} />
)}

{/* Follow button... */}

{/* NEW: Portfolio Section (if creator) */}
{profile.creatorType && (
  <section className="mt-8">
    <PortfolioGrid userId={profile.id} isOwner={isOwner} />
  </section>
)}

{/* NEW: Commission Menu (if creator has menu) */}
{profile.commissionInfo?.menu?.length > 0 && (
  <section className="mt-8">
    <CommissionMenu 
      info={profile.commissionInfo} 
      status={profile.commissionStatus} 
    />
  </section>
)}
```

---

## Sprint Plan (2 Weeks)

### Week 1: Backend + Database

| Day | Tasks | Hours |
|-----|-------|-------|
| **1** | Run SQL migrations (add columns + create portfolio_items) | 1h |
| **1** | Set up Supabase Storage bucket + policies | 1h |
| **1** | Add fields to Profile JPA entity | 2h |
| **2** | Create `PortfolioItem` entity + repository | 2h |
| **2** | Create `PortfolioService` + `PortfolioController` | 3h |
| **3** | Create `CreatorService` + `CreatorController` | 3h |
| **3** | Extend `ProfileService` to return new fields | 2h |
| **4** | Test all endpoints with curl/Postman | 2h |
| **4** | Fix bugs | 2h |
| **5** | Buffer / catch-up | 4h |

### Week 2: Frontend

| Day | Tasks | Hours |
|-----|-------|-------|
| **1** | Add `creatorApi` to api.js | 1h |
| **1** | Create `CreatorTypeBadge`, `CommissionStatusBadge` | 1h |
| **1** | Create `SupportLinksDisplay` | 2h |
| **2** | Create `PortfolioGrid`, `PortfolioCard` | 3h |
| **2** | Create `PortfolioUploadModal` | 2h |
| **3** | Create `CommissionMenu` | 2h |
| **3** | Integrate all components into profile page | 2h |
| **4** | Create `/settings/creator` page with forms | 4h |
| **5** | Testing, responsive fixes, polish | 4h |
| **6-7** | Buffer, deploy, fix production bugs | 8h |

---

## Shortcuts & Decisions

| Decision | Rationale |
|----------|-----------|
| Extend `profiles` table, don't create new | Simpler, no JOINs, faster queries |
| Use JSONB for commission_info | Flexible schema, no extra tables |
| Migrate `gift_link` → `support_links` | Backwards compatible |
| Use JPA for portfolio (not JOOQ) | Simple CRUD, faster to implement |
| No image resizing | Let browser handle, saves complexity |
| No drag-to-reorder | Can add later, use display_order field |
| No lightbox | Images open in new tab |
| Portfolio images via Supabase Storage | Already have it, no extra infra |

---

## Testing Checklist

### Backend
- [ ] `PATCH /api/creator/profile` updates all fields correctly
- [ ] `GET /api/profiles/{username}` returns new creator fields
- [ ] `GET /api/creator/{userId}/portfolio` returns items ordered
- [ ] `POST /api/creator/portfolio` creates item
- [ ] `DELETE /api/creator/portfolio/{id}` only deletes own items
- [ ] 401 returned for unauthenticated requests

### Frontend
- [ ] Profile shows creator badges when `creatorType` is set
- [ ] Portfolio grid loads and displays
- [ ] Can upload new portfolio item
- [ ] Can delete own portfolio item
- [ ] Commission menu displays prices correctly
- [ ] Support links open in new tab
- [ ] Creator settings form saves correctly
- [ ] Mobile responsive

---

## Post-MVP Features (After Deadline)

- [ ] Browse/discover creators page
- [ ] Commission request system with chat
- [ ] Lightbox gallery viewer
- [ ] Drag-to-reorder portfolio
- [ ] Image cropping/resizing on upload
- [ ] Creator verification badges
- [ ] Boost system integration
