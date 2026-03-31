"""
Eventbrite scraper — server-rendered HTML with structured event cards.
Scrapes all events in Phnom Penh from Eventbrite's search page.
Uses requests + BeautifulSoup.
"""

import json
import logging
import re
import requests
from bs4 import BeautifulSoup

from .base import BaseScraper, RawPost

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


class EventbriteScraper(BaseScraper):
    platform = "eventbrite"

    def scrape(self) -> list[RawPost]:
        url = "https://www.eventbrite.com/d/cambodia--phnom-penh/events/"
        posts = []

        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")

            # Try extracting from embedded __SERVER_DATA__ JSON first
            server_posts = self._extract_from_server_data(soup)
            if server_posts:
                posts.extend(server_posts)
                logger.info(f"Eventbrite: extracted {len(server_posts)} events from embedded JSON")
                return posts

            # Fallback: parse HTML event cards directly
            html_posts = self._extract_from_html(soup)
            posts.extend(html_posts)
            logger.info(f"Eventbrite: scraped {len(html_posts)} events from HTML")

        except requests.RequestException as e:
            logger.warning(f"Eventbrite: failed to fetch {url} — {e}")
        except Exception as e:
            logger.error(f"Eventbrite: error scraping — {e}")

        return posts

    def _extract_from_server_data(self, soup: BeautifulSoup) -> list[RawPost] | None:
        """Try to extract events from Eventbrite's __SERVER_DATA__ JSON."""
        for script in soup.find_all("script"):
            text = script.string or ""
            if "__SERVER_DATA__" not in text:
                continue

            # Extract the JSON object assigned to __SERVER_DATA__
            match = re.search(r'__SERVER_DATA__\s*=\s*({.*?});?\s*$', text, re.DOTALL)
            if not match:
                continue

            try:
                data = json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

            # Navigate the nested structure to find events
            events = self._find_events_in_data(data)
            if not events:
                return None

            posts = []
            for event in events:
                try:
                    name = event.get("name") or event.get("title") or ""
                    desc = event.get("summary") or event.get("description") or ""
                    url = event.get("url") or ""
                    image = event.get("image", {})
                    image_url = image.get("url") if isinstance(image, dict) else image

                    if not name or not url:
                        continue

                    # Build text content for Gemini extraction
                    text_parts = [name]
                    if desc:
                        text_parts.append(desc)
                    # Include date/venue info if available
                    start_date = event.get("start_date") or event.get("startDate") or ""
                    venue = event.get("primary_venue", {})
                    venue_name = venue.get("name") if isinstance(venue, dict) else ""
                    if start_date:
                        text_parts.append(f"Date: {start_date}")
                    if venue_name:
                        text_parts.append(f"Venue: {venue_name}")

                    posts.append(RawPost(
                        text="\n".join(text_parts)[:2000],
                        image_url=image_url,
                        post_url=url,
                        source_page_name="Eventbrite",
                    ))
                except Exception as e:
                    logger.debug(f"Eventbrite: failed to parse event from JSON — {e}")

            return posts if posts else None

        return None

    def _find_events_in_data(self, data: dict) -> list[dict] | None:
        """Recursively search for an events array in the nested JSON."""
        if isinstance(data, dict):
            for key in ("events", "search_events", "results"):
                if key in data and isinstance(data[key], list):
                    return data[key]
            # Search one level deeper
            for value in data.values():
                result = self._find_events_in_data(value)
                if result:
                    return result
        return None

    def _extract_from_html(self, soup: BeautifulSoup) -> list[RawPost]:
        """Fallback: extract events from HTML event cards."""
        posts = []

        # Eventbrite uses various card selectors
        cards = soup.select(
            "[data-testid='event-card'], .search-event-card-wrapper, "
            ".eds-event-card, article[class*='event']"
        )

        for card in cards:
            try:
                text = card.get_text(separator=" ", strip=True)
                if not text or len(text) < 15:
                    continue

                # Find event link
                link = card.find("a", href=True)
                post_url = link["href"] if link else ""
                if not post_url:
                    continue
                if not post_url.startswith("http"):
                    post_url = "https://www.eventbrite.com" + post_url

                # Find cover image
                img = card.find("img", src=True)
                image_url = img.get("src") or img.get("data-src") if img else None
                if image_url and image_url.startswith("data:"):
                    image_url = None

                posts.append(RawPost(
                    text=text[:2000],
                    image_url=image_url,
                    post_url=post_url,
                    source_page_name="Eventbrite",
                ))
            except Exception as e:
                logger.debug(f"Eventbrite: failed to parse card — {e}")

        return posts
