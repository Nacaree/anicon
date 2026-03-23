"""
Supabase database client for scraped events.
Uses service role key to bypass RLS. Upserts on source_url to prevent duplicates.
"""

import logging
from datetime import datetime, timezone
from supabase import create_client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logger = logging.getLogger(__name__)


def get_client():
    """Create a Supabase client with the service role key (bypasses RLS)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upsert_event(client, event_data: dict) -> bool:
    """
    Upsert a scraped event into the scraped_events table.
    Uses source_url as the dedup key (UNIQUE constraint).

    Sets created_at to event_date so events distribute naturally in the feed
    timeline instead of clustering at the scrape time.

    Returns True if inserted/updated, False on error.
    """
    try:
        # Build the row to upsert
        row = {
            "title": event_data.get("title", "")[:255],
            "description": event_data.get("description"),
            "event_date": event_data.get("event_date"),
            "event_time": event_data.get("event_time"),
            "end_time": event_data.get("end_time"),
            "location": event_data.get("location"),
            "cover_image_url": event_data.get("cover_image_url"),
            "source_platform": event_data["source_platform"],
            "source_url": event_data["source_url"],
            "source_page_name": event_data.get("source_page_name"),
            "tags": event_data.get("tags", []),
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Use current time for created_at so scraped events interleave naturally
        # with user posts in the feed (not pinned to event_date, which causes
        # future events to permanently sit above all user posts)
        row["created_at"] = datetime.now(timezone.utc).isoformat()

        # Upsert — on conflict (source_url), update all fields except created_at
        # so re-scraping refreshes data but doesn't move events in the timeline
        result = (
            client.table("scraped_events")
            .upsert(row, on_conflict="source_url")
            .execute()
        )

        return True
    except Exception as e:
        logger.error(f"Failed to upsert event: {event_data.get('source_url')} — {e}")
        return False


def is_already_scraped(client, source_url: str) -> bool:
    """Check if a source_url already exists in the database (dedup check)."""
    try:
        result = (
            client.table("scraped_events")
            .select("id")
            .eq("source_url", source_url)
            .limit(1)
            .execute()
        )
        return len(result.data) > 0
    except Exception:
        return False
