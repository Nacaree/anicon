"""
AllEvents.in scraper — uses Playwright because the site is Vue.js rendered.
Scrapes 3 category URLs for anime/Japanese/cosplay events in Phnom Penh.
"""

import logging
from playwright.sync_api import sync_playwright

from .base import BaseScraper, RawPost
from config import SOURCES

logger = logging.getLogger(__name__)


class AllEventsScraper(BaseScraper):
    platform = "allevents"

    def scrape(self) -> list[RawPost]:
        urls = SOURCES["allevents"]["urls"]
        posts = []

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            for url in urls:
                try:
                    page_posts = self._scrape_url(page, url)
                    posts.extend(page_posts)
                    logger.info(f"AllEvents: scraped {len(page_posts)} items from {url}")
                except Exception as e:
                    logger.error(f"AllEvents: failed to scrape {url} — {e}")

            browser.close()

        # Deduplicate by post_url within this scraper run
        seen = set()
        unique = []
        for post in posts:
            if post.post_url not in seen:
                seen.add(post.post_url)
                unique.append(post)

        logger.info(f"AllEvents: total {len(unique)} unique items")
        return unique

    def _scrape_url(self, page, url: str) -> list[RawPost]:
        """Scrape a single AllEvents.in category page."""
        posts = []
        page.goto(url, wait_until="networkidle", timeout=30000)

        # Wait for event cards to render (Vue.js app)
        try:
            page.wait_for_selector(".event-card, .event-item, [class*='event']", timeout=10000)
        except Exception:
            logger.warning(f"AllEvents: no event cards found on {url}")
            return posts

        # Scroll down to load more events (lazy-loaded content)
        for _ in range(3):
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(1500)

        # Extract event cards — AllEvents.in uses various card selectors
        cards = page.query_selector_all(".event-card, .event-item, [class*='event-card']")

        for card in cards:
            try:
                # Extract text content from the card
                text = card.inner_text().strip()
                if not text or len(text) < 10:
                    continue

                # Try to find the event link
                link_el = card.query_selector("a[href]")
                post_url = link_el.get_attribute("href") if link_el else ""
                if post_url and not post_url.startswith("http"):
                    post_url = "https://allevents.in" + post_url

                if not post_url:
                    continue

                # Try to find the cover image (check lazy-load attrs for Vue.js rendered pages)
                img_el = card.query_selector("img")
                image_url = None
                if img_el:
                    image_url = (
                        img_el.get_attribute("src")
                        or img_el.get_attribute("data-src")
                        or img_el.get_attribute("data-lazy-src")
                        or img_el.get_attribute("data-original")
                    )
                # Normalize relative URLs to absolute
                if image_url and not image_url.startswith("http"):
                    image_url = "https://allevents.in" + image_url
                # Skip placeholder images (data URIs, 1x1 pixel trackers)
                if image_url and (image_url.startswith("data:") or "1x1" in image_url):
                    image_url = None

                posts.append(RawPost(
                    text=text,
                    image_url=image_url,
                    post_url=post_url,
                    source_page_name="AllEvents.in",
                ))
            except Exception as e:
                logger.debug(f"AllEvents: failed to parse card — {e}")

        return posts
