# Creator Portfolio — Build Progress

## Overview
Implementation of Feature 3: Creator Portfolio from `FEATURE3_CREATOR_PORTFOLIO_FINAL.md`. Covers Week 1 (Backend) and Week 2 (Frontend) sprint tasks.

---

## Week 1: Backend

### Day 1 — SQL Migrations + Entity Updates

**SQL migrations (run manually in Supabase):**
- Added columns to `profiles`: `banner_image_url`, `creator_type`, `commission_status`, `commission_info` (JSONB), `support_links` (JSONB)
- Migrated existing `gift_link` data into `support_links` JSONB array
- Created `portfolio_items` table (id, user_id, image_url, title, description, category, character_name, series_name, display_order, is_featured, timestamps)
- Created `portfolio` Supabase Storage bucket with public read, owner-only write/delete policies

**Entity/DTO updates:**
- `Profile.java` — added 5 new creator fields with `@JdbcTypeCode(SqlTypes.JSON)` for JSONB
- `ProfileResponse.java` — added matching fields; JSONB fields use `@JsonRawValue String` (JOOQ can't auto-map JSONB to Map/List)
- Regenerated JOOQ types via `./mvnw jooq-codegen:generate`

### Day 2–3 — Creator API + Portfolio CRUD

**New package: `com.anicon.backend.creator`**

- `CreatorController.java` — `PATCH /api/creator/profile` (authenticated)
- `CreatorService.java` — JOOQ update for creator fields with `@CacheEvict` on profile cache. Updates: display_name, bio, banner_image_url, creator_type, commission_status, commission_info, support_links
- `CreatorProfileUpdateRequest.java` — record DTO with displayName, bio, bannerImageUrl, creatorType, commissionStatus, commissionInfo (Map), supportLinks (List)
- `PortfolioController.java` — REST endpoints under `/api/creator`
  - `GET /api/creator/{userId}/portfolio` (public)
  - `POST /api/creator/portfolio` (authenticated)
  - `PUT /api/creator/portfolio/{id}` (authenticated, owner-only)
  - `DELETE /api/creator/portfolio/{id}` (authenticated, owner-only)
- `PortfolioService.java` — CRUD with ownership checks (403 if not owner)
- `PortfolioItem.java` — JPA entity for `portfolio_items` table
- `PortfolioItemRepository.java` — Spring Data JPA with `findByUserIdOrderByDisplayOrderAsc`
- `PortfolioItemRequest.java` / `PortfolioItemResponse.java` — request/response DTOs

**SecurityConfig changes:**
- `GET /api/profiles/**` → permitAll (all profile lookups public)
- `GET /api/creator/*/portfolio` → permitAll (portfolio viewing public)

---

## Week 2: Frontend

### Day 1 — API Client + Creator Components

**`frontend/src/lib/api.js`** — added `creatorApi` export:
- `updateCreatorProfile(data)` — PATCH
- `getPortfolio(userId)` — GET (noAuth)
- `addPortfolioItem(data)` — POST
- `updatePortfolioItem(id, data)` — PUT
- `deletePortfolioItem(id)` — DELETE

**New components (`frontend/src/components/creator/`):**
- `CreatorTypeBadge.js` — pill badge with icon per creator type
- `CommissionStatusBadge.js` — green/yellow/red status dot
- `SupportLinksDisplay.js` — external tip/support link buttons
- `CommissionMenu.js` — price list with terms and contact info
- `PortfolioCard.js` — gallery item with hover overlay, two-step delete confirmation
- `PortfolioUploadModal.js` — file picker → Supabase Storage upload → backend API call
- `PortfolioGrid.js` — responsive grid with skeleton loading, upload button for owner

### Day 2 — Profile Page (Facebook-style layout)

**`frontend/src/app/profiles/[username]/page.js`:**
- Full-width banner: `h-[280px] md:h-[350px]` with `shadow-md`
- Content container: `max-w-[940px] mx-auto`
- Avatar: `w-[168px] h-[168px]`, overlaps banner with `-mt-[35px]`
- Display name: `text-[28px] font-bold` (falls back to username if not set)
- Username, follower/following count, joined date below name
- Creator type badge (cosplayer, digital artist, etc.)
- Bio, social links, support links sections
- Portfolio grid (only for creators)
- Commission menu (only if menu items exist)
- Edit Profile button (only for profile owner)

**`frontend/src/proxy.js`** — added `/profiles` to `publicRoutes` so profile pages work without auth

### Day 3 — Creator Settings Page

**`frontend/src/app/settings/creator/page.js`:**
- Display name input
- Bio textarea
- Banner image upload (to Supabase Storage `portfolio` bucket)
- Creator type dropdown (cosplayer, digital artist, traditional artist, crafter, writer)
- Commission settings: status (open/waitlist/closed), turnaround time, contact method, terms
- Dynamic price menu (add/remove items with name + price)
- Support/tip links (type dropdown + label + URL, add/remove)
- Save button calls `creatorApi.updateCreatorProfile()` then `fetchProfile()` to refresh AuthContext

---

## Bugs Fixed During Build

| Bug | Root Cause | Fix |
|---|---|---|
| JOOQ JSONB mapping error | `fetchOptionalInto()` can't map JSONB to Map/List | Changed JSONB fields in `ProfileResponse` to `String` with `@JsonRawValue` |
| 403 on profile page | `GET /api/profiles/{username}` not in SecurityConfig permitAll | Changed matcher to `GET /api/profiles/**` |
| Redirect to signup on profile page | `/profiles` not in frontend middleware public routes | Added to `publicRoutes` in `proxy.js` |
| Display name not visible on profile | `items-end` flex alignment clipped text behind banner | Changed to `items-start`, adjusted margins |
| Settings page used `refreshSession` | `refreshSession` refreshes JWT, not profile data | Changed to `fetchProfile()` which re-fetches from backend |

---

## File Extensions
All frontend files use `.js` (not `.jsx`) — consistent with the rest of the codebase.
