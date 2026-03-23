"""
Best of Phnom Penh (bestofpp.com) scraper — server-rendered calendar.
Covers all event types, so we keyword-filter before sending to Gemini.
Uses requests + BeautifulSoup.
"""

import logging
import requests
from bs4 import BeautifulSoup

from .base import BaseScraper, RawPost
from config import BESTOFPP_KEYWORDS

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AniCon Event Scraper; +https://anicon.online)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


class BestOfPPScraper(BaseScraper):
    platform = "bestofpp"

    def scrape(self) -> list[RawPost]:
        posts = []
        url = "https://bestofpp.com/en/calendar"

        try:
            page_posts = self._scrape_page(url)
            # Filter for anime/Japanese content before AI extraction
            filtered = [p for p in page_posts if self._matches_keywords(p.text)]
            posts.extend(filtered)
            logger.info(
                f"BestOfPP: scraped {len(page_posts)} items, "
                f"{len(filtered)} matched anime/Japanese keywords"
            )
        except requests.RequestException as e:
            logger.warning(f"BestOfPP: failed to fetch {url} — {e}")
        except Exception as e:
            logger.error(f"BestOfPP: error scraping {url} — {e}")

        return posts

    def _scrape_page(self, url: str) -> list[RawPost]:
        """Scrape the Best of PP calendar page."""
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        posts = []

        # Look for calendar entries / event cards
        # The site uses various selectors for event listings
        events = soup.select(
            ".event, .calendar-event, .event-item, article, "
            ".listing-item, [class*='event'], [class*='calendar']"
        )

        for event in events:
            try:
                text = event.get_text(separator=" ", strip=True)
                if not text or len(text) < 15:
                    continue

                # Find the event link
                link = event.find("a", href=True)
                post_url = link["href"] if link else url
                if not post_url.startswith("http"):
                    post_url = "https://bestofpp.com" + post_url

                # Find the cover image (with lazy-loading fallback)
                img = event.find("img", src=True)
                image_url = img["src"] if img else None
                if not image_url:
                    img_lazy = event.find("img", attrs={"data-src": True})
                    image_url = img_lazy["data-src"] if img_lazy else None
                if not image_url:
                    img_lazy = event.find("img", attrs={"data-lazy-src": True})
                    image_url = img_lazy["data-lazy-src"] if img_lazy else None
                # Normalize relative URLs to absolute
                if image_url and not image_url.startswith("http"):
                    image_url = "https://bestofpp.com" + image_url
                # Skip placeholder images
                if image_url and (image_url.startswith("data:") or "1x1" in image_url):
                    image_url = None

                posts.append(RawPost(
                    text=text[:2000],
                    image_url=image_url,
                    post_url=post_url,
                    source_page_name="Best of Phnom Penh",
                ))
            except Exception as e:
                logger.debug(f"BestOfPP: failed to parse event — {e}")

        return posts

    def _matches_keywords(self, text: str) -> bool:
        """Check if text contains any anime/Japanese-related keywords."""
        text_lower = text.lower()
        return any(kw in text_lower for kw in BESTOFPP_KEYWORDS)
