# Global Search — Instant Dropdown + Results Page

## Context
The Header has a non-functional search input placeholder. We need a full search feature: as-you-type instant dropdown (top 3 results per category) + a dedicated `/search` results page with category tabs. Uses simple `ILIKE` substring matching on PostgreSQL. Searches across users, events, and posts.

## Architecture Overview

```
Header search input → debounced API call → dropdown with top results
                    → Enter key → /search?q=term → full results page with tabs
```

---

## Backend — `GET /api/search?q=term&type=all&limit=5`

### New files

**1. `backend/src/main/java/com/anicon/backend/search/SearchController.java`**
- `GET /api/search` — public endpoint (permitAll), optionally authenticated
- Params: `q` (required, min 1 char), `type` (all/users/events/posts, default "all"), `limit` (default 5, max 20)
- Injects `@AuthenticationPrincipal SupabaseUserPrincipal` (nullable for guests)
- Returns `SearchResponse`

**2. `backend/src/main/java/com/anicon/backend/search/SearchService.java`**
- Uses JOOQ `DSLContext` (matches PostService/EventService pattern)
- Three private methods: `searchUsers()`, `searchEvents()`, `searchPosts()`
- Each uses `ILIKE '%term%'` for text matching

**User search** — matches against `username`, `display_name`, `bio`:
```sql
SELECT id, username, display_name, avatar_url, roles, follower_count
FROM profiles
WHERE username ILIKE '%term%' OR display_name ILIKE '%term%'
ORDER BY follower_count DESC
LIMIT :limit
```

**Event search** — matches against `title`, `description`, `location`, `category`:
```sql
SELECT id, title, location, event_date, event_time, category, cover_image_url,
       is_free, ticket_price, current_attendance
FROM events
WHERE (title ILIKE '%term%' OR description ILIKE '%term%' OR location ILIKE '%term%')
  AND event_date >= CURRENT_DATE
ORDER BY event_date ASC
LIMIT :limit
```
- Also load tags via `multiset()` (reuse EventService pattern)

**Post search** — matches against `text_content`:
```sql
SELECT id, user_id, text_content, like_count, comment_count, repost_count, created_at
FROM posts
WHERE text_content ILIKE '%term%' AND is_deleted = false
ORDER BY created_at DESC
LIMIT :limit
```
- Batch-fetch author info and first image (reuse PostService pattern)
- If authenticated, batch-fetch `likedByCurrentUser` state

**3. `backend/src/main/java/com/anicon/backend/search/dto/SearchResponse.java`**
```java
public record SearchResponse(
    List<UserResult> users,
    List<EventResult> events,
    List<PostResult> posts
) {}
```

**4. `backend/src/main/java/com/anicon/backend/search/dto/UserResult.java`**
```java
public record UserResult(
    UUID id, String username, String displayName,
    String avatarUrl, String[] roles, long followerCount
) {}
```

**5. `backend/src/main/java/com/anicon/backend/search/dto/EventResult.java`**
```java
public record EventResult(
    UUID id, String title, String location,
    LocalDate eventDate, LocalTime eventTime, String category,
    String coverImageUrl, boolean isFree, BigDecimal ticketPrice,
    int currentAttendance, List<String> tags
) {}
```

**6. `backend/src/main/java/com/anicon/backend/search/dto/PostResult.java`**
```java
public record PostResult(
    UUID id, PostAuthorResponse author, String textContent,
    String firstImageUrl, long likeCount, long commentCount,
    OffsetDateTime createdAt
) {}
```

### Modify existing files

**7. `SecurityConfig.java`** — add permitAll for search:
```java
.requestMatchers(HttpMethod.GET, "/api/search").permitAll()
```

---

## Frontend — Instant Dropdown

### New files

**8. `frontend/src/components/search/SearchDropdown.jsx`**
- Rendered inside Header, positioned absolute below search input
- Shows when input is focused AND has text (min 2 chars)
- Three sections: "People", "Events", "Posts" — each shows top 3 results
- Each section has a "See all" link → navigates to `/search?q=term&tab=users/events/posts`
- Dismiss on: click outside, Escape key, blur
- Debounced API call (300ms) via `searchApi.search(q, "all", 3)`

**Result row components (inside SearchDropdown or split out):**
- **UserRow**: avatar + display name + @username + follower count
- **EventRow**: cover image thumbnail + title + date + location
- **PostRow**: author avatar + author name + truncated text (1 line)

Clicking a result:
- User → `router.push(/profiles/{username})`
- Event → `router.push(/events/{id})`
- Post → `window.dispatchEvent(new CustomEvent("anicon-open-post", { detail: { postId } }))` (opens global modal)

**9. `frontend/src/components/search/SearchResultsPage.jsx`** (client component used by the route)
- Full results page with tabs: "All", "People", "Events", "Posts"
- URL: `/search?q=term&tab=all`
- Each tab shows up to 20 results with "Load more" or scroll pagination
- Reuses existing card components where possible (PostCard for posts, event card pattern for events)
- "All" tab shows top 5 of each category with "See all →" links

**10. `frontend/src/app/search/page.js`** — thin route wrapper
- Reads `searchParams.q` and `searchParams.tab`
- Renders `<SearchResultsPage />`

### Modify existing files

**11. `frontend/src/components/Header.js`**
- Add state: `searchQuery`, `showDropdown`
- Wire `onChange`, `onFocus`, `onKeyDown` (Enter → navigate to `/search?q=`)
- Render `<SearchDropdown>` below input when active
- Add mobile search: a search icon button (visible on `sm:hidden`) that expands to a full-width input overlay

**12. `frontend/src/lib/api.js`** — add `searchApi`:
```javascript
export const searchApi = {
  search: (q, type = "all", limit = 5) =>
    request(`/api/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`, {
      bestEffortAuth: true,
    }),
};
```
Uses `bestEffortAuth` so authenticated users get liked/reposted state on posts, but search still works instantly for guests.

**13. `frontend/src/proxy.js`** — add `/search` to public routes (if not already covered by default)

---

## Mobile Search UX

The search bar is `hidden sm:block` — on mobile, we add:
- A search icon button in the Header (visible `sm:hidden`)
- Clicking it opens a full-width search overlay/bar at the top of the screen
- Same dropdown behavior, just full-width
- Close via X button or Escape

---

## Files Summary

| # | File | Action |
|---|------|--------|
| 1 | `backend/.../search/SearchController.java` | NEW |
| 2 | `backend/.../search/SearchService.java` | NEW |
| 3 | `backend/.../search/dto/SearchResponse.java` | NEW |
| 4 | `backend/.../search/dto/UserResult.java` | NEW |
| 5 | `backend/.../search/dto/EventResult.java` | NEW |
| 6 | `backend/.../search/dto/PostResult.java` | NEW |
| 7 | `backend/.../config/SecurityConfig.java` | MODIFY — add permitAll |
| 8 | `frontend/src/components/search/SearchDropdown.jsx` | NEW |
| 9 | `frontend/src/components/search/SearchResultsPage.jsx` | NEW |
| 10 | `frontend/src/app/search/page.js` | NEW |
| 11 | `frontend/src/components/Header.js` | MODIFY — wire search input + mobile icon |
| 12 | `frontend/src/lib/api.js` | MODIFY — add searchApi |
| 13 | `frontend/src/proxy.js` | MODIFY — add /search to public routes |

## What does NOT change
- PostDetailModal / PostModalContext — post results dispatch the existing `anicon-open-post` event
- PostCard / PostFeed — not reused in search (search uses lightweight result rows)
- Sidebar — no changes
- Backend existing controllers/services — no changes

## Verification
- Type "naruto" in search bar → dropdown shows matching users, events, posts within 300ms
- Click a user result → navigates to `/profiles/{username}`
- Click an event result → navigates to `/events/{id}`
- Click a post result → PostDetailModal opens as overlay
- Press Enter → navigates to `/search?q=naruto` with full results
- Switch tabs on results page → filters by category
- Mobile: tap search icon → overlay opens → same functionality
- Empty/short query (< 2 chars) → no API call, dropdown hidden
- Guest user → search works, no liked state on posts
- Logged-in user → search works, posts show liked state
