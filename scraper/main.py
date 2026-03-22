"""
Event scraper entry point — orchestrates all 4 source scrapers sequentially.
Each scraper is error-isolated so one failing doesn't stop the others.

Pipeline per source:
  1. Scrape raw posts (text + image + URL)
  2. Dedup check (skip if source_url already in DB)
  3. Send to Gemini for structured extraction
  4. If is_event=true and has title → upsert to scraped_events table
"""

import logging
import sys

from database import get_client, upsert_event, is_already_scraped
from ai_extractor import extract_event
from scrapers import AllEventsScraper, KawaiiConScraper, CJCCScraper, BestOfPPScraper

# Configure logging — structured output for Railway logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("scraper")


def process_scraper(scraper, db_client):
    """
    Run a single scraper through the full pipeline:
    scrape → dedup → AI extract → upsert.
    Returns (scraped_count, new_events_count, skipped_count).
    """
    platform = scraper.platform
    scraped = 0
    new_events = 0
    skipped = 0

    try:
        raw_posts = scraper.scrape()
        scraped = len(raw_posts)
        logger.info(f"[{platform}] Scraped {scraped} raw posts")
    except Exception as e:
        logger.error(f"[{platform}] Scraping failed: {e}")
        return 0, 0, 0

    for post in raw_posts:
        # Dedup check — skip if already in database
        if is_already_scraped(db_client, post.post_url):
            skipped += 1
            continue

        # Send to Gemini for structured extraction
        extracted = extract_event(post.text, platform)
        if not extracted:
            continue

        # Build the event data for database upsert
        event_data = {
            **extracted,
            "cover_image_url": post.image_url,
            "source_platform": platform,
            "source_url": post.post_url,
            "source_page_name": post.source_page_name,
        }

        # Upsert to database
        if upsert_event(db_client, event_data):
            new_events += 1

    return scraped, new_events, skipped


def main():
    logger.info("=" * 60)
    logger.info("AniCon Event Scraper — Starting")
    logger.info("=" * 60)

    db_client = get_client()

    # All scrapers to run — order doesn't matter, but AllEvents first
    # since it has the most content (and uses Playwright which is slower)
    scrapers = [
        AllEventsScraper(),
        KawaiiConScraper(),
        CJCCScraper(),
        BestOfPPScraper(),
    ]

    total_scraped = 0
    total_new = 0
    total_skipped = 0

    for scraper in scrapers:
        logger.info(f"--- Running {scraper.platform} scraper ---")
        try:
            scraped, new_events, skipped = process_scraper(scraper, db_client)
            total_scraped += scraped
            total_new += new_events
            total_skipped += skipped
            logger.info(
                f"[{scraper.platform}] Done: "
                f"{scraped} scraped, {new_events} new events, {skipped} skipped (already in DB)"
            )
        except Exception as e:
            # Error-isolated — one scraper failing doesn't stop others
            logger.error(f"[{scraper.platform}] Fatal error: {e}")

    logger.info("=" * 60)
    logger.info(
        f"Scraper complete: {total_scraped} total scraped, "
        f"{total_new} new events added, {total_skipped} skipped"
    )
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
