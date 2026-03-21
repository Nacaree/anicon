# Event Scraper — Implementation Plan (Final Draft)

## Context

AniCon needs automated event discovery as a thesis feature. The original `docs/EVENT_SCRAPING.md` proposed scraping Facebook directly with regex extraction — this plan replaces that with a more reliable approach: scrape **4 public event sites** (no Facebook) and use **Gemini 2.5 Flash AI** for structured data extraction instead of fragile regex. Scraped events appear in the **main social feed** alongside user posts (not on the /events page), including past events for content backfill.

### Why not Facebook?

- Facebook actively blocks scrapers — accounts get banned within 1-3 months
- Requires authenticated session that gets invalidated unpredictably
- Violates Facebook TOS (legal risk for a public-facing product)
- Regex extraction fails on bilingual Khmer/English posts

### Why Gemini instead of regex?

- Handles bilingual Khmer/English text natively
- Can determine "is this an event?" (replaces rules-based filter)
- Extracts titles, dates, locations from unstructured text far better than regex
- Gemini 2.5 Flash free tier: 500 RPD — more than enough for ~100 posts/day
- More impressive for thesis — shows AI integration

---

## Architecture Overview

```
4 Source Sites                    Gemini 2.5 Flash              Supabase
┌─────────────┐                  ┌──────────────┐            ┌──────────────┐
│ AllEvents.in│─(Playwright)──→  │ "Is this an  │            │scraped_events│
│ KAWAII-CON  │─(BeautifulSoup)→ │  event? If   │──(JSON)──→ │    table     │
│ CJCC        │─(BeautifulSoup)→ │  yes, extract│            └──────┬───────┘
│ Best of PP  │─(BeautifulSoup)→ │  title/date/ │                   │
└─────────────┘                  │  location"   │          GET /api/feed
                                 └──────────────┘     (UNION posts + scraped_events)
                                                              │
                                                     ┌────────┴────────┐
                                                     │  Homepage Feed  │
                                                     │ PostCard + ScrapedEventCard │
                                                     └─────────────────┘
```

## Decisions Made

| Decision | Choice | Why |
|----------|--------|-----|
| Scraper hosting | Separate Python service (`/scraper`), Railway Cron | Keeps backend clean, Playwright needs Chromium |
| Sources | AllEvents.in + KAWAII-CON + CJCC + Best of PP | All scrapable, no Facebook needed |
| Extraction | Gemini 2.5 Flash (free tier, 500 RPD) | Handles bilingual Khmer/English, better for thesis |
| Display | Main feed only (not /events page) | User requirement |
| Past events | Included | Content backfill + searchable archive |
| Feed ordering | `created_at = event_date` | Events distribute naturally across timeline |
| Schedule | Daily at 6 AM UTC (1 PM Cambodia) | Matches low event volume |

---

## Source Sites — Scrapability Analysis

| Source | URL | Rendering | Auth? | Anti-Scraping | Anime Content | Method |
|--------|-----|-----------|-------|---------------|---------------|--------|
| **AllEvents.in** | `allevents.in/phnom penh/anime`, `/japanese`, `/cosplay` | Vue.js (JS-rendered) | No | Moderate | Yes, dedicated categories | Playwright |
| **KAWAII-CON** | `khmerfes-kawaii.com` | WordPress (server-rendered) | No | None | Cambodia's biggest anime event | requests + BS4 |
| **CJCC** | `cjcc.edu.kh` | WordPress/Elementor (server-rendered) | No | None | Japanese cultural events (Kizuna, Tanabata) | requests + BS4 |
| **Best of PP** | `bestofpp.com/en/calendar` | Server-rendered calendar | No | None | Occasional anime/Japanese events | requests + BS4 |

**Why these 4?**
- AllEvents.in is the best volume source — it aggregates events from Facebook and other platforms, so you get Facebook event data *indirectly* without scraping Facebook.
- KAWAII-CON, CJCC, and Best of PP are direct sources for Cambodia's anime/Japanese culture scene.
- All are legally scrapable (public data, no auth required, no TOS issues).

**Sites ruled out:**
- **Eventbrite** — zero anime events in Cambodia
- **10times.com** — barely any Cambodia content, failed to load
- **Ticketmelon** — negligible Cambodia coverage
- **Facebook** — blocks scrapers, TOS violation, requires auth

---

## Phase 1: Database + JOOQ (Day 1)

### 1.1 Create `scraped_events` table

Run in Supabase SQL Editor:

```sql
CREATE TABLE scraped_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  event_date        DATE,
  event_time        TIME,
  end_time          TIME,
  location          TEXT,
  cover_image_url   TEXT,
  source_platform   VARCHAR(50) NOT NULL,  -- 'allevents', 'kawaiicon', 'cjcc', 'bestofpp'
  source_url        TEXT NOT NULL UNIQUE,   -- dedup key
  source_page_name  VARCHAR(255),
  tags              TEXT[],
  scraped_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),  -- set to event_date for feed ordering
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scraped_events_created_at ON scraped_events(created_at DESC);
CREATE INDEX idx_scraped_events_source_url ON scraped_events(source_url);
CREATE INDEX idx_scraped_events_platform ON scraped_events(source_platform);
CREATE INDEX idx_scraped_events_date ON scraped_events(event_date);
```

**Key design decisions:**
- **Separate from `posts` and `events` tables**: scraped events have no user_id, no like/comment/repost counters, and no organizer. Putting them in `posts` would require NULLing half the columns. Putting them in `events` would degrade the integrity of native events.
- **Past events included**: No future-date constraint. Past events are included for content backfill + searchable archive.
- **`created_at = event_date`**: When the scraper inserts, it sets `created_at` to the event's actual date so events distribute naturally across the feed timeline instead of clustering at the top.
- **`tags TEXT[]`**: PostgreSQL array, not a junction table. Scraped event tags are display-only strings with no relations.
- **`source_url UNIQUE`**: Dedup key — prevents re-inserting the same event on subsequent scraper runs.

### 1.2 JOOQ codegen

```zsh
cd backend && ./mvnw jooq-codegen:generate
```

Commit generated files (per existing convention — JOOQ types are checked into git).

---

## Phase 2: Backend — Polymorphic Feed (Days 1-2)

### 2.1 New package: `com.anicon.backend.feed`

| File | Purpose |
|------|---------|
| `FeedController.java` | `GET /api/feed?cursor=&limit=20` — unified feed endpoint |
| `FeedService.java` | Queries posts (via PostService) + scraped_events (via JOOQ), merges by created_at DESC |
| `dto/FeedItemResponse.java` | Polymorphic wrapper: `{ type: "post"|"scraped_event", post?, scrapedEvent? }` |
| `dto/ScrapedEventResponse.java` | DTO for scraped event fields |
| `dto/UnifiedFeedResponse.java` | `{ items: List<FeedItemResponse>, nextCursor: String }` |

### 2.2 Feed merge strategy

Two parallel queries + Java merge (NOT SQL UNION ALL) because `PostService.getFeed()` already has complex batch-fetching (images, likes, repost state) that can't easily be reproduced in a UNION:

1. Call existing `postService.getFeed(cursor, limit+1, userId)` → get posts
2. Query `scraped_events` with same cursor format (Base64 timestamp|UUID) → get events
3. Two-pointer merge both sorted lists by `created_at DESC`, take first `limit` items
4. Derive `nextCursor` from the last merged item

**FeedItemResponse** (polymorphic wrapper):
```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FeedItemResponse(
    String type,                      // "post" or "scraped_event"
    PostResponse post,                // non-null when type="post"
    ScrapedEventResponse scrapedEvent // non-null when type="scraped_event"
) {
    public static FeedItemResponse ofPost(PostResponse post) {
        return new FeedItemResponse("post", post, null);
    }
    public static FeedItemResponse ofScrapedEvent(ScrapedEventResponse event) {
        return new FeedItemResponse("scraped_event", null, event);
    }
}
```

**ScrapedEventResponse** DTO:
```java
public record ScrapedEventResponse(
    UUID id, String title, String description,
    LocalDate eventDate, LocalTime eventTime, LocalTime endTime,
    String location, String coverImageUrl,
    String sourcePlatform, String sourceUrl, String sourcePageName,
    List<String> tags, OffsetDateTime createdAt
) {}
```

### 2.3 Key files to modify

- **`SecurityConfig.java`** — add `permitAll()` for `GET /api/feed`
- **`SearchService.java`** — add `searchScrapedEvents()` method (ILIKE on title + description + location)
- **`SearchResponse.java`** — add `List<ScrapedEventSearchResult> scrapedEvents` field

### 2.4 Existing code to reuse

- Cursor encode/decode from `PostService.java` (Base64 ISO_OFFSET_DATE_TIME|UUID format)
- JOOQ query patterns from `SearchService.java` for scraped event queries
- `@JsonInclude(NON_NULL)` on FeedItemResponse to omit null post/scrapedEvent field

---

## Phase 3: Frontend (Days 2-3)

### 3.1 New `feedApi` in `api.js`

```javascript
export const feedApi = {
  getFeed: (cursor = null, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request(`/api/feed?${params}`, { method: "GET", bestEffortAuth: true });
  },
};
```

### 3.2 New `ScrapedEventCard` component

Location: `frontend/src/components/feed/ScrapedEventCard.js`

Layout:
```
┌──────────────────────────────────────────┐
│ [Source badge: "AllEvents.in"]  · Mar 15  │
│ ┌──────────────────────────────────────┐ │
│ │       Cover Image (16:9)             │ │
│ └──────────────────────────────────────┘ │
│ Event Title (bold)                       │
│ Mar 15, 2026  ·  2:00 PM                │
│ AEON Mall, Phnom Penh                    │
│ Description (truncated 3 lines)...       │
│ [#cosplay] [#anime]                      │
│ [ View Event → ]  (opens sourceUrl)      │
└──────────────────────────────────────────┘
```

- No action bar (no likes/comments/reposts) — scraped events are display-only
- "View Event" CTA opens `sourceUrl` in new tab (`target="_blank"`)
- Source badge with globe icon to indicate external content
- Follows interactive chip pattern: `hover:scale-[1.02] active:scale-[0.98]` on CTA
- Follows glow shadow pattern on CTA: `hover:shadow-[0_4px_20px_rgba(255,121,39,0.4)]`

### 3.3 Modify homepage feed

In `app/page.js`, switch from `postsApi.getFeed` to `feedApi.getFeed`:

```javascript
const fetchFeed = useCallback(async (cursor) => {
  const result = await feedApi.getFeed(cursor);
  // Transform polymorphic items into shape PostFeed expects
  const posts = (result?.items ?? []).map(item => {
    if (item.type === 'post') return { ...item.post, __feedType: 'post' };
    return { ...item.scrapedEvent, __feedType: 'scraped_event' };
  });
  return { posts, nextCursor: result?.nextCursor };
}, []);
```

In `PostFeed.js`, render conditionally based on `__feedType`:
```javascript
item.__feedType === 'scraped_event'
  ? <ScrapedEventCard event={item} />
  : <PostCard post={item} ... />
```

### 3.4 Profile pages — NO change

Profile pages use `postsApi.getUserPosts(userId)` → `GET /api/posts/user/{userId}`. Scraped events never appear on profile pages.

### 3.5 Search integration

- Add "Discovered" section to `SearchDropdown.js` for scraped event results
- Add "Discovered" tab to `SearchResultsPage.js`
- Clicking a scraped event result opens `sourceUrl` in new tab

---

## Phase 4: Python Scraper Service (Days 3-5)

### 4.1 Directory structure

```
/scraper
├── main.py                  # Entry point — orchestrates all 4 scrapers
├── config.py                # Source URLs, Gemini/Supabase config
├── database.py              # Supabase client (upsert with source_url dedup)
├── ai_extractor.py          # Gemini 2.5 Flash structured extraction
├── scrapers/
│   ├── __init__.py
│   ├── base.py              # BaseScraper ABC → scrape() -> list[RawPost]
│   ├── allevents.py         # AllEvents.in (Playwright, 3 categories)
│   ├── kawaiicon.py         # khmerfes-kawaii.com (requests + BS4)
│   ├── cjcc.py              # cjcc.edu.kh (requests + BS4)
│   └── bestofpp.py          # bestofpp.com/en/calendar (requests + BS4)
├── Dockerfile
├── requirements.txt
└── README.md
```

### 4.2 Pipeline flow

```
For each source:
  1. Scrape raw posts → list of { text, image_url, post_url }
  2. Dedup check: skip if source_url already in DB
  3. Send text to Gemini 2.5 Flash → structured JSON extraction
  4. Gemini returns: { is_event, title, description, event_date, event_time, location, tags }
  5. If is_event=false → skip
  6. Validate output (must have title at minimum)
  7. Upsert to scraped_events table (created_at = event_date or now())
```

### 4.3 Gemini extraction (`ai_extractor.py`)

Uses `google-generativeai` Python SDK with JSON response schema:

```python
import google.generativeai as genai

EXTRACTION_PROMPT = """Analyze this text from a Cambodia event listing page.
If this is an event announcement, extract the structured data.
If this is NOT an event (e.g. a general post, ad, or article), set is_event to false.

Text:
{text}

Source: {source_name}
"""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "is_event": {"type": "boolean"},
        "title": {"type": "string"},
        "description": {"type": "string"},
        "event_date": {"type": "string", "description": "ISO format YYYY-MM-DD or null"},
        "event_time": {"type": "string", "description": "HH:MM format or null"},
        "end_time": {"type": "string", "description": "HH:MM format or null"},
        "location": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["is_event"]
}
```

- Model: `gemini-2.5-flash` (free tier, 500 RPD)
- JSON mode enabled for reliable structured output
- ~100 calls/day, well within free quota
- Rate limit: sleep 0.5s between calls to respect 15 RPM limit

### 4.4 Scraper specifics

| Source | Method | Notes |
|--------|--------|-------|
| **AllEvents.in** | Playwright | Vue.js rendered. 3 URLs: `/phnom penh/anime`, `/japanese`, `/cosplay`. Wait for `.event-card` selectors. Scroll to load more. Extract text + image + link from each card. |
| **KAWAII-CON** | requests + BS4 | WordPress. Scrape main page + `/events` + `/news`. Parse `<article>` tags. |
| **CJCC** | requests + BS4 | WordPress/Elementor. Scrape events page. Parse event cards. |
| **Best of PP** | requests + BS4 | Server-rendered calendar at `/en/calendar`. Filter for anime/Japanese keywords before sending to Gemini (this site covers all event types). |

### 4.5 Database client (`database.py`)

- Uses Supabase Python client with **service role key** (bypasses RLS)
- `upsert(on_conflict="source_url")` — re-scraping updates data + bumps `scraped_at`, but preserves `created_at`
- Sets `created_at = event_date::timestamptz` when event_date is available, otherwise `now()`

### 4.6 requirements.txt

```
playwright==1.41.0
beautifulsoup4>=4.12.0
requests>=2.31.0
supabase>=2.3.0
google-generativeai>=0.8.0
python-dateutil>=2.8.2
lxml>=5.0.0
```

### 4.7 Dockerfile

```dockerfile
FROM python:3.11-slim
# Playwright/Chromium system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && playwright install chromium
COPY . .
CMD ["python", "main.py"]
```

---

## Phase 5: Deploy (Day 6)

### Railway Cron Service

1. Railway dashboard → AniCon project → "New Service" → deploy from repo
2. Root directory: `/scraper`
3. Cron schedule: `0 6 * * *` (daily 6 AM UTC = 1 PM Cambodia)
4. Environment variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Same as backend |
| `SUPABASE_SERVICE_KEY` | Service role key from Supabase dashboard |
| `GEMINI_API_KEY` | From Google AI Studio (free tier) |

---

## Verification

1. **Database:** After SQL migration, verify table exists: `SELECT * FROM scraped_events LIMIT 0`
2. **Backend feed:** `GET /api/feed` returns posts (empty scraped events initially). Verify JSON shape: `{ items: [{ type: "post", post: {...} }], nextCursor: "..." }`
3. **Scraper local test:** `cd scraper && python main.py` — verify events scraped and inserted
4. **Feed with events:** After scraper runs, `GET /api/feed` returns mixed items. Verify cursor pagination works across both types.
5. **Frontend:** Homepage shows PostCard and ScrapedEventCard interleaved. Click "View Event" opens source in new tab.
6. **Search:** `GET /api/search?q=anime&type=scraped_events` returns scraped events
7. **Dedup:** Run scraper twice — second run should update existing rows, not create duplicates
8. **Profile pages:** Verify `GET /api/posts/user/{userId}` still returns only posts (no scraped events)

---

## Critical Files

### Backend (modify)
- `backend/src/main/java/com/anicon/backend/config/SecurityConfig.java` — add permitAll for `/api/feed`
- `backend/src/main/java/com/anicon/backend/search/SearchService.java` — add scraped event search
- `backend/src/main/java/com/anicon/backend/search/dto/SearchResponse.java` — add scrapedEvents field

### Backend (create)
- `backend/src/main/java/com/anicon/backend/feed/FeedController.java`
- `backend/src/main/java/com/anicon/backend/feed/FeedService.java`
- `backend/src/main/java/com/anicon/backend/feed/dto/FeedItemResponse.java`
- `backend/src/main/java/com/anicon/backend/feed/dto/ScrapedEventResponse.java`
- `backend/src/main/java/com/anicon/backend/feed/dto/UnifiedFeedResponse.java`
- `backend/src/main/java/com/anicon/backend/search/dto/ScrapedEventSearchResult.java`

### Frontend (modify)
- `frontend/src/lib/api.js` — add feedApi
- `frontend/src/app/page.js` — switch to feedApi.getFeed
- `frontend/src/components/posts/PostFeed.js` — conditional ScrapedEventCard rendering
- `frontend/src/components/search/SearchDropdown.js` — add scraped events section
- `frontend/src/components/search/SearchResultsPage.js` — add "Discovered" tab

### Frontend (create)
- `frontend/src/components/feed/ScrapedEventCard.js`

### Scraper (create — entire `/scraper` directory)
- `scraper/main.py`
- `scraper/config.py`
- `scraper/database.py`
- `scraper/ai_extractor.py`
- `scraper/scrapers/base.py`
- `scraper/scrapers/allevents.py`
- `scraper/scrapers/kawaiicon.py`
- `scraper/scrapers/cjcc.py`
- `scraper/scrapers/bestofpp.py`
- `scraper/Dockerfile`
- `scraper/requirements.txt`

---

## Cost Summary

| Component | Monthly Cost |
|-----------|-------------|
| Railway Cron Service | ~$5-10 (Playwright + Chromium RAM) |
| Gemini 2.5 Flash API | $0 (free tier) |
| Supabase | $0 (within free tier) |
| **Total** | **~$5-10/month** |
