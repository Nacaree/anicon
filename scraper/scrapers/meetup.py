"""
Meetup.com scraper — extracts events from Phnom Penh search results.
Meetup embeds event data in the HTML via Apollo GraphQL cache or
server-rendered event cards. Uses requests + BeautifulSoup.
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


class MeetupScraper(BaseScraper):
    platform = "meetup"

    def scrape(self) -> list[RawPost]:
        url = "https://www.meetup.com/find/?location=kh--Phnom%20Penh&source=EVENTS"
        posts = []

        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")

            # Try extracting from embedded Apollo state first
            apollo_posts = self._extract_from_apollo(soup)
            if apollo_posts:
                posts.extend(apollo_posts)
                logger.info(f"Meetup: extracted {len(apollo_posts)} events from Apollo state")
                return posts

            # Try JSON-LD structured data
            jsonld_posts = self._extract_from_jsonld(soup)
            if jsonld_posts:
                posts.extend(jsonld_posts)
                logger.info(f"Meetup: extracted {len(jsonld_posts)} events from JSON-LD")
                return posts

            # Fallback: parse HTML event cards
            html_posts = self._extract_from_html(soup)
            posts.extend(html_posts)
            logger.info(f"Meetup: scraped {len(html_posts)} events from HTML")

        except requests.RequestException as e:
            logger.warning(f"Meetup: failed to fetch {url} — {e}")
        except Exception as e:
            logger.error(f"Meetup: error scraping — {e}")

        return posts

    def _extract_from_apollo(self, soup: BeautifulSoup) -> list[RawPost] | None:
        """Try to extract events from Meetup's __APOLLO_STATE__ JSON."""
        for script in soup.find_all("script"):
            text = script.string or ""
            if "__APOLLO_STATE__" not in text:
                continue

            match = re.search(r'__APOLLO_STATE__\s*=\s*({.*?});?\s*$', text, re.DOTALL)
            if not match:
                continue

            try:
                data = json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

            posts = []
            for key, value in data.items():
                if not isinstance(value, dict):
                    continue
                # Apollo cache keys for events typically contain "Event:"
                if not key.startswith("Event:") and value.get("__typename") != "Event":
                    continue

                try:
                    title = value.get("title") or value.get("name") or ""
                    desc = value.get("description") or ""
                    event_url = value.get("eventUrl") or value.get("url") or ""

                    if not title or not event_url:
                        continue

                    # Build text for Gemini
                    text_parts = [title]
                    if desc:
                        text_parts.append(desc[:500])
                    date_time = value.get("dateTime") or value.get("startDate") or ""
                    if date_time:
                        text_parts.append(f"Date: {date_time}")
                    venue = value.get("venue") or {}
                    if isinstance(venue, dict) and venue.get("name"):
                        text_parts.append(f"Venue: {venue['name']}")

                    # Find image
                    image = value.get("image") or value.get("imageUrl") or ""
                    if isinstance(image, dict):
                        image = image.get("source") or image.get("url") or ""

                    posts.append(RawPost(
                        text="\n".join(text_parts)[:2000],
                        image_url=image or None,
                        post_url=event_url,
                        source_page_name="Meetup",
                    ))
                except Exception as e:
                    logger.debug(f"Meetup: failed to parse Apollo event — {e}")

            return posts if posts else None

        return None

    def _extract_from_jsonld(self, soup: BeautifulSoup) -> list[RawPost] | None:
        """Try to extract events from JSON-LD structured data."""
        posts = []

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
            except json.JSONDecodeError:
                continue

            # JSON-LD can be a single object or array
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get("@type") != "Event":
                    continue

                title = item.get("name") or ""
                desc = item.get("description") or ""
                url = item.get("url") or ""
                if not title or not url:
                    continue

                text_parts = [title]
                if desc:
                    text_parts.append(desc[:500])
                start = item.get("startDate") or ""
                if start:
                    text_parts.append(f"Date: {start}")
                location = item.get("location", {})
                if isinstance(location, dict) and location.get("name"):
                    text_parts.append(f"Venue: {location['name']}")

                image = item.get("image") or ""
                if isinstance(image, list):
                    image = image[0] if image else ""

                posts.append(RawPost(
                    text="\n".join(text_parts)[:2000],
                    image_url=image or None,
                    post_url=url,
                    source_page_name="Meetup",
                ))

        return posts if posts else None

    def _extract_from_html(self, soup: BeautifulSoup) -> list[RawPost]:
        """Fallback: extract events from HTML event cards."""
        posts = []

        # Meetup uses various card selectors
        cards = soup.select(
            "[data-testid='categoryResults-eventCard'], "
            "[class*='eventCard'], [class*='event-listing'], "
            "a[href*='/events/']"
        )

        seen_urls = set()
        for card in cards:
            try:
                text = card.get_text(separator=" ", strip=True)
                if not text or len(text) < 15:
                    continue

                # Find event link
                if card.name == "a":
                    post_url = card.get("href", "")
                else:
                    link = card.find("a", href=True)
                    post_url = link["href"] if link else ""

                if not post_url:
                    continue
                if not post_url.startswith("http"):
                    post_url = "https://www.meetup.com" + post_url

                # Skip duplicates within this run
                if post_url in seen_urls:
                    continue
                seen_urls.add(post_url)

                # Find cover image
                img = card.find("img")
                image_url = None
                if img:
                    image_url = img.get("src") or img.get("data-src")
                    if image_url and image_url.startswith("data:"):
                        image_url = None

                posts.append(RawPost(
                    text=text[:2000],
                    image_url=image_url,
                    post_url=post_url,
                    source_page_name="Meetup",
                ))
            except Exception as e:
                logger.debug(f"Meetup: failed to parse card — {e}")

        return posts
