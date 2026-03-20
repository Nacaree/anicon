# EVENT_SCRAPING.md

Feature 2 planning document for Claude Code. This feature automatically discovers anime/Japanese pop-culture events from external sources and publishes them to AniCon.

---

## Feature Overview

**Goal:** The system automatically scrapes event announcements from Facebook pages/groups and publishes them to AniCon as "discoverable" events — users can see event details but click through to the original source (no ticket sales for scraped events).

**Key Principle:** Fully automatic. No admin review. The scraper uses rules-based filtering and regex extraction to validate and parse events before publishing.

---

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Facebook   │      │   Python    │      │   Supabase  │
│  Pages /    │─────►│   Scraper   │─────►│   events    │─────► Live on Site
│  Groups     │      │  (Playwright)│      │   table     │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                     ┌──────┴──────┐
                     │  Validation │
                     │  Pipeline   │
                     └─────────────┘
                            │
                  ┌─────────┼─────────┐
                  ▼         ▼         ▼
              Rules      Regex       Dedup
              Filter    Extractor    Check
```

### Scheduling

- **Platform:** Railway Cron Service (same project as the backend)
- **Frequency:** Daily at 6 AM UTC (1 PM Cambodia time)
- **Schedule:** `0 6 * * *`

---

## Tech Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Language | Python 3.11+ | Scraper lives in `/scraper` directory |
| Browser Automation | Playwright | Handles JavaScript-rendered Facebook pages |
| Event Detection | Rules + Regex | Keyword filter → regex date/time/location extraction |
| Database | Supabase Python Client | Direct insert to events table |
| Scheduling | Railway Cron Service | Runs as a separate service in the same Railway project |
| Container | Docker | `scraper/Dockerfile` for Railway deployment |

---

## Data Model

### Schema Changes to `events` Table

Add these columns to support scraped events:

```sql
-- Run in Supabase SQL Editor

-- New columns for event source tracking
ALTER TABLE events
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'native'
    CHECK (source IN ('native', 'scraped'));

ALTER TABLE events
ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50);

ALTER TABLE events
ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS source_page_name VARCHAR(255);

ALTER TABLE events
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

-- Scraped events have no organizer account on AniCon
ALTER TABLE events ALTER COLUMN organizer_id DROP NOT NULL;

-- Scraped events may not fit mini/normal classification
ALTER TABLE events ALTER COLUMN event_type DROP NOT NULL;

-- Scraper may not always determine these fields
ALTER TABLE events ALTER COLUMN category DROP NOT NULL;
ALTER TABLE events ALTER COLUMN location DROP NOT NULL;
ALTER TABLE events ALTER COLUMN event_time DROP NOT NULL;

-- Prevent duplicate scraped events (same Facebook post URL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_url
ON events (source_url)
WHERE source_url IS NOT NULL;

-- For efficient filtering of upcoming scraped events
CREATE INDEX IF NOT EXISTS idx_events_source_date
ON events (source, event_date)
WHERE source = 'scraped';
```

### Field Usage by Source Type

| Field | Native Events | Scraped Events |
|-------|---------------|----------------|
| `title` | Required | Extracted by regex (first line or text before date) |
| `description` | Required | Original post text |
| `event_date` | Required | Extracted by regex |
| `event_time` | Required | Nullable (regex may not find it) |
| `location` | Required | Nullable (keyword match may not find it) |
| `cover_image_url` | From upload | From Facebook post image |
| `ticket_price` | Set by organizer | Always null (assume free) |
| `max_capacity` | Set by organizer | Always null |
| `organizer_id` | FK to profiles | Always null |
| `event_type` | Required | Always null |
| `category` | Required | Always null |
| `is_free` | Required | Always true |
| `source` | `'native'` | `'scraped'` |
| `source_platform` | null | `'facebook'` |
| `source_url` | null | Link to original post |
| `source_page_name` | null | e.g., "Cambodia Cosplay Community" |
| `scraped_at` | null | When scraper found it |

---

## Validation Pipeline

Every scraped post must pass ALL checks before publishing:

```
Post Scraped
     │
     ▼
┌─────────────────────┐
│ 1. RULES FILTER     │──── Fail ───► Discard
│    - Has date?      │
│    - Has keywords?  │
└──────────┬──────────┘
           │ Pass
           ▼
┌─────────────────────┐
│ 2. DUPLICATE CHECK  │──── Exists ─► Skip
│    - source_url     │
│      already in DB? │
└──────────┬──────────┘
           │ New
           ▼
┌─────────────────────┐
│ 3. REGEX EXTRACTION │──── No date found ─► Discard
│    - Extract date   │
│    - Extract title  │
│    - Extract time   │
│    - Extract location│
└──────────┬──────────┘
           │ Has date
           ▼
┌─────────────────────┐
│ 4. DATE VALIDATION  │──── Past date ─► Discard
│    - Is date in     │
│      the future?    │
└──────────┬──────────┘
           │ Future date
           ▼
       PUBLISH
```

---

## Scraper Implementation

### Directory Structure

```
/scraper
├── main.py              # Entry point, orchestrates scraping
├── config.py            # Source URLs, keywords, settings
├── facebook_scraper.py  # Playwright logic for Facebook
├── validators.py        # Rules-based filtering
├── extractor.py         # Regex-based date/time/location extraction
├── database.py          # Supabase client wrapper
├── Dockerfile           # For Railway Cron Service deployment
├── requirements.txt     # Python dependencies
└── README.md            # Setup instructions
```

### Source Configuration

```python
# scraper/config.py

SOURCES = [
    {
        "url": "https://www.facebook.com/CambodiaCosplay",
        "platform": "facebook",
        "name": "Cambodia Cosplay Community",
        "type": "page"
    },
    {
        "url": "https://www.facebook.com/groups/PhnomPenhAnime",
        "platform": "facebook",
        "name": "Phnom Penh Anime Fans",
        "type": "group"
    },
    # Add more sources as discovered
]

# Keywords that suggest a post is an event
EVENT_KEYWORDS_EN = [
    'event', 'convention', 'con', 'meetup', 'meet up', 'gathering',
    'cosplay', 'contest', 'competition', 'festival', 'fair',
    'workshop', 'exhibition', 'exhibit', 'show', 'party'
]

EVENT_KEYWORDS_KH = [
    'ព្រឹត្តិការណ៍',  # event
    'កម្មវិធី',      # program/event
    'ការប្រកួត',     # competition
    'ពិព័រណ៍',       # exhibition
]

# Location keywords for Cambodia
LOCATION_KEYWORDS = [
    'aeon', 'aeon mall', 'factory', 'the factory',
    'bkk', 'bkk1', 'russian market', 'central market',
    'phnom penh', 'pp', 'siem reap', 'cafe', 'mall',
    'exchange square', 'naga', 'koh pich', 'diamond island'
]
```

### Rules-Based Filter

```python
# scraper/validators.py

import re
from config import EVENT_KEYWORDS_EN, EVENT_KEYWORDS_KH, LOCATION_KEYWORDS

# Date patterns to look for in post text
DATE_PATTERNS = [
    r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',           # 15/03/2025, 3-15-25
    r'\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)',  # 15 March
    r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}',  # March 15
    r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)',   # Day names
]

def might_be_event(post_text: str) -> bool:
    """
    Quick rules-based filter to discard obvious non-events.
    Returns True if post MIGHT be an event (send to regex extractor).
    Returns False if definitely NOT an event (discard).
    """
    text_lower = post_text.lower()

    # Must have some date-like pattern
    has_date = any(re.search(pattern, post_text, re.IGNORECASE) for pattern in DATE_PATTERNS)
    if not has_date:
        return False

    # Must have event keyword OR location keyword
    has_event_keyword = any(kw in text_lower for kw in EVENT_KEYWORDS_EN)
    has_khmer_keyword = any(kw in post_text for kw in EVENT_KEYWORDS_KH)
    has_location = any(loc in text_lower for loc in LOCATION_KEYWORDS)

    return has_event_keyword or has_khmer_keyword or has_location
```

### Regex-Based Extraction

```python
# scraper/extractor.py
#
# Extracts event data from post text using regex patterns only.
# No LLM dependency — trades accuracy for simplicity and zero API cost.

import re
from datetime import date, datetime
from dateutil import parser as dateutil_parser

# Time patterns: "2:00 PM", "14:00", "2pm", etc.
TIME_PATTERNS = [
    r'(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))',       # 2:00 PM
    r'(\d{1,2}\s*(?:AM|PM|am|pm))',               # 2PM, 2 pm
    r'(\d{1,2}:\d{2})\s*(?:hrs?|hours?)',          # 14:00 hrs
    r'(?:at|from|starts?)\s+(\d{1,2}:\d{2})',      # at 14:00, from 2:00
]

# Date patterns with capture groups for extraction
DATE_EXTRACT_PATTERNS = [
    # 15/03/2025 or 03-15-2025
    r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
    # March 15, 2025 or Mar 15
    r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:\s*,?\s*\d{4})?)',
    # 15 March 2025 or 15 Mar
    r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*(?:\s*,?\s*\d{4})?)',
]


def extract_date(text: str) -> str | None:
    """
    Try to extract a date from post text using regex + dateutil.
    Returns ISO format 'YYYY-MM-DD' or None.
    """
    for pattern in DATE_EXTRACT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                # dateutil.parser handles many date formats automatically
                parsed = dateutil_parser.parse(match.group(1), fuzzy=True)
                # If no year was in the string, dateutil defaults to current year.
                # If that date is in the past, assume next year.
                if parsed.date() < date.today():
                    parsed = parsed.replace(year=parsed.year + 1)
                return parsed.date().isoformat()
            except (ValueError, OverflowError):
                continue
    return None


def extract_time(text: str) -> str | None:
    """
    Try to extract a time from post text.
    Returns 'HH:MM' format or None.
    """
    for pattern in TIME_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                parsed = dateutil_parser.parse(match.group(1), fuzzy=True)
                return parsed.strftime("%H:%M")
            except (ValueError, OverflowError):
                continue
    return None


def extract_title(text: str) -> str:
    """
    Extract a title from the post text.
    Strategy: use the first non-empty line, truncated to 200 chars.
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return "Untitled Event"
    # Use first line as title, capped at 200 chars
    title = lines[0][:200]
    return title


def extract_location(text: str) -> str | None:
    """
    Try to match known Cambodia venue keywords in the text.
    Returns the matched venue phrase or None.
    """
    from config import LOCATION_KEYWORDS
    text_lower = text.lower()
    for keyword in LOCATION_KEYWORDS:
        if keyword in text_lower:
            # Find the surrounding context for a more useful location string.
            # Look for the sentence/line containing the keyword.
            for line in text.split('\n'):
                if keyword in line.lower():
                    return line.strip()[:200]
            return keyword.title()
    return None


def extract_event_data(text: str) -> dict | None:
    """
    Orchestrate all extractors. Returns event dict or None if no date found.
    A date is the minimum required field — without it, we can't list the event.
    """
    event_date = extract_date(text)
    if not event_date:
        return None

    return {
        "title": extract_title(text),
        "date": event_date,
        "time": extract_time(text),
        "location": extract_location(text),
    }
```

### Facebook Scraper

```python
# scraper/facebook_scraper.py
#
# Playwright-based Facebook page scraper.
# Facebook's DOM structure changes frequently — selectors may need updates.

import random
import time


def scrape_facebook_page(browser, url: str) -> list[dict]:
    """
    Scrape recent posts from a Facebook page.
    Returns list of {text, image_url, post_url}
    """
    page = browser.new_page()

    # Random delay to avoid detection patterns
    time.sleep(random.uniform(1, 3))

    page.goto(url, wait_until="networkidle")

    # Wait for posts to load
    try:
        page.wait_for_selector('div[data-pagelet="page"]', timeout=10000)
    except Exception:
        # Group pages may have different structure
        page.wait_for_selector('div[role="main"]', timeout=10000)

    # Scroll down to load more posts
    for _ in range(3):
        page.evaluate("window.scrollBy(0, 1000)")
        time.sleep(random.uniform(0.5, 1.5))

    posts = []
    # Facebook's class names are auto-generated and change often.
    # This selector targets the post container divs — may need periodic updates.
    post_elements = page.query_selector_all('div[class*="x1yztbdb"]')[:10]

    for el in post_elements:
        try:
            text = el.inner_text()
            if not text or len(text) < 20:
                continue

            # Try to get image from the post
            img = el.query_selector('img[src*="scontent"]')
            image_url = img.get_attribute('src') if img else None

            # Try to get direct post link
            link = el.query_selector('a[href*="/posts/"]')
            post_url = link.get_attribute('href') if link else url

            posts.append({
                "text": text,
                "image_url": image_url,
                "post_url": post_url
            })
        except Exception as e:
            print(f"Error parsing post: {e}")
            continue

    page.close()
    return posts
```

### Database Client

```python
# scraper/database.py
#
# Supabase client wrapper for event operations.
# Uses service role key to bypass RLS (row-level security).

import os
from datetime import datetime
from supabase import create_client

# Initialize once — reused across all operations in a single run
_client = None

def get_client():
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"]
        )
    return _client


def event_exists(source_url: str) -> bool:
    """Check if we already have an event from this source URL."""
    result = get_client().table("events") \
        .select("id") \
        .eq("source_url", source_url) \
        .execute()
    return len(result.data) > 0


def publish_event(event_data: dict, source_config: dict, post: dict):
    """
    Insert a validated scraped event into the database.
    Scraped events are always free, have no organizer, and link back to the source.
    """
    get_client().table("events").insert({
        "title": event_data["title"],
        "description": post["text"][:2000],
        "event_date": event_data["date"],
        "event_time": event_data.get("time"),
        "location": event_data.get("location"),
        "cover_image_url": post.get("image_url"),
        "is_free": True,
        "source": "scraped",
        "source_platform": source_config["platform"],
        "source_url": post["post_url"],
        "source_page_name": source_config["name"],
        "scraped_at": datetime.utcnow().isoformat(),
    }).execute()
```

### Main Scraper Flow

```python
# scraper/main.py
#
# Entry point for the event scraper.
# Iterates over configured Facebook sources, scrapes posts, validates them
# through the rules→dedup→regex→date pipeline, and publishes to Supabase.

from datetime import date, datetime
from playwright.sync_api import sync_playwright

from config import SOURCES
from validators import might_be_event
from extractor import extract_event_data
from database import event_exists, publish_event
from facebook_scraper import scrape_facebook_page


def main():
    print(f"Starting scrape at {datetime.utcnow().isoformat()}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        total_found = 0
        total_published = 0

        for source in SOURCES:
            print(f"\nScraping: {source['name']}")

            try:
                posts = scrape_facebook_page(browser, source["url"])
                print(f"  Found {len(posts)} posts")

                for post in posts:
                    # Step 1: Quick rules filter (keywords + date patterns)
                    if not might_be_event(post["text"]):
                        continue

                    total_found += 1

                    # Step 2: Check for duplicates via source_url unique index
                    if event_exists(post["post_url"]):
                        print(f"  Already exists: {post['post_url'][:50]}...")
                        continue

                    # Step 3: Regex extraction — extract date, title, time, location
                    event_data = extract_event_data(post["text"])
                    if not event_data:
                        print(f"  Could not extract date from post, skipping")
                        continue

                    # Step 4: Validate date is in the future
                    event_date = date.fromisoformat(event_data["date"])
                    if event_date < date.today():
                        print(f"  Past event: {event_data['date']}, skipping")
                        continue

                    # Step 5: Publish to Supabase
                    publish_event(event_data, source, post)
                    total_published += 1
                    print(f"  Published: {event_data['title'][:60]}")

            except Exception as e:
                print(f"  Error scraping {source['name']}: {e}")
                continue

        browser.close()

    print(f"\nSummary: {total_published} published out of {total_found} potential events")


if __name__ == "__main__":
    main()
```

### Requirements

```
# scraper/requirements.txt

playwright==1.41.0
supabase>=2.3.0
python-dateutil>=2.8.2
```

### Dockerfile

```dockerfile
# scraper/Dockerfile
#
# Docker image for the event scraper Railway Cron Service.
# Includes Playwright + Chromium for headless Facebook scraping.

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

## Railway Cron Service Setup

Deploy the `/scraper` directory as a separate Railway Cron Service:

1. In Railway dashboard → your AniCon project → **"New Service"** → **"Deploy from repo"**
2. Set **root directory** to `/scraper`
3. Add environment variables:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_KEY` — service role key (bypasses RLS)
4. Under **Settings → Cron** → set schedule: `0 6 * * *` (daily 6 AM UTC = 1 PM Cambodia)
5. Railway builds the Docker image from `scraper/Dockerfile` and runs `python main.py` on schedule

---

## Frontend Changes

### Event Card Component

Update `EventsPageCard` to handle both native and scraped events:

- If `event.source === 'scraped'`: wrap card in `<a>` (external link) instead of `<Link>` (internal)
- Show a "Found on Facebook" badge for scraped events
- Hide "Save Event" button (no ticket/RSVP for scraped events)

### Event Detail Page

- If event is scraped: show simplified view with event info + "View on Facebook" CTA
- Hide ticket/RSVP controls for scraped events
- Show `sourcePageName` instead of organizer profile

### API Changes

Backend `GET /api/events` already returns all upcoming events — scraped events will appear
alongside native events automatically after the schema + DTO changes. Add the new source
fields to `EventResponse` DTO and `normalizeEvent()` in the frontend.

---

## Environment Variables

### Railway Cron Service

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) |

### Local Development

```zsh
# Set up scraper environment
cd scraper
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Run scraper locally
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ..."
python main.py
```

---

## Cost Estimation

| Component | Cost |
|-----------|------|
| Railway Cron Service | ~$0 (runs briefly once/day, well within free tier) |
| Supabase | Free tier sufficient |
| **Monthly estimate** | **$0** |

No LLM API costs — extraction is fully regex-based.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Facebook blocks scraper | Rotate user agents, random delays between requests, headless Chromium |
| Wrong data extracted | Date validation (reject past dates), keyword filter (reject non-events) |
| Scraper breaks silently | Railway shows failed cron runs in dashboard; check periodically |
| Duplicate events | UNIQUE constraint on `source_url` prevents re-inserting the same post |
| Expired events shown | Backend already filters `event_date >= today` in `listUpcomingEvents()` |
| Regex misses a date | Post is simply skipped — no harm, just a missed event |

**Trade-off vs LLM approach:** Regex extraction is less accurate for ambiguous posts (unusual
date formats, creative titles). The scraper will miss some events and occasionally extract wrong
titles. This is acceptable for an MVP — the key metric is "does AniCon show more events than
before?" not "does it catch 100% of events?".

---

## Implementation Order

1. **Database:** Run ALTER TABLE statements in Supabase SQL Editor
2. **JOOQ:** Regenerate types: `cd backend && ./mvnw jooq-codegen:generate`
3. **Backend:** Add source fields to EventResponse DTO, update EventService queries/mappers
4. **Frontend:** Update `normalizeEvent()`, `EventsPageCard`, and event detail page
5. **Scraper:** Create `/scraper` directory with all Python files + Dockerfile
6. **Deploy:** Set up Railway Cron Service with env vars and schedule
7. **Test:** Manual trigger on Railway, verify scraped events appear on site

---

## Still Needed

- [ ] Confirm Facebook page URLs to scrape (current ones are placeholders)
- [ ] Run SQL schema changes in Supabase
- [ ] Set up Railway Cron Service with env vars
- [ ] Test scraper against real Facebook pages (selectors may need tuning)
