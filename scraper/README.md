# AniCon Event Scraper

Automated event discovery service that scrapes 4 public event sites for anime/Japanese culture events in Cambodia.

## Setup

```bash
pip install -r requirements.txt
playwright install chromium
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) |
| `GEMINI_API_KEY` | Google AI Studio API key (free tier) |

## Run Locally

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ..."
export GEMINI_API_KEY="AI..."
python main.py
```

## Sources

| Source | Method | Content |
|--------|--------|---------|
| AllEvents.in | Playwright | Aggregated anime/cosplay events |
| KAWAII-CON | BeautifulSoup | Cambodia's biggest anime event |
| CJCC | BeautifulSoup | Japanese cultural events |
| Best of PP | BeautifulSoup | Occasional anime events (keyword-filtered) |

## Deploy (Railway Cron)

- Root directory: `/scraper`
- Schedule: `0 6 * * *` (daily 6 AM UTC = 1 PM Cambodia)
