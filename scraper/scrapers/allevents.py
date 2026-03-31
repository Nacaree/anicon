"""
AllEvents.in scraper — uses Playwright because the site is Vue.js rendered.
Scrapes 3 category URLs for anime/Japanese/cosplay events in Phnom Penh.
"""

import logging
import re
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

    def _extract_image_url(self, card) -> str | None:
        """
        Try multiple extraction methods for Vue.js lazy-loaded images.
        AllEvents.in uses base64 placeholder GIFs in <img src> — the real
        image URL is typically in srcset, background-image, or data attributes.
        """

        # 1. <img> tag — check standard + lazy-load attributes
        img_el = card.query_selector("img")
        if img_el:
            url = (
                img_el.get_attribute("src")
                or img_el.get_attribute("data-src")
                or img_el.get_attribute("data-lazy-src")
                or img_el.get_attribute("data-original")
            )
            # If src is a data URI placeholder, try srcset instead
            if not url or url.startswith("data:") or "1x1" in url:
                srcset = img_el.get_attribute("srcset") or img_el.get_attribute("data-srcset")
                if srcset:
                    url = srcset.split(",")[0].strip().split(" ")[0]
            if url and not url.startswith("data:") and "1x1" not in url:
                return url

        # 2. <picture><source> tags
        source_el = card.query_selector("picture source[srcset]")
        if source_el:
            srcset = source_el.get_attribute("srcset")
            if srcset:
                return srcset.split(",")[0].strip().split(" ")[0]

        # 3. Inline style background-image on card or child divs
        elements = [card] + card.query_selector_all("div[style*='background']")
        for el in elements:
            style = el.get_attribute("style") or ""
            if "url(" in style:
                match = re.search(r'url\(["\']?(.*?)["\']?\)', style)
                if match and not match.group(1).startswith("data:"):
                    return match.group(1)

        # 4. Computed CSS backgroundImage (Vue.js often sets this dynamically)
        try:
            bg = card.evaluate(
                '(el) => window.getComputedStyle(el).backgroundImage'
            )
            if bg and bg != "none":
                match = re.search(r'url\(["\']?(.*?)["\']?\)', bg)
                if match and not match.group(1).startswith("data:"):
                    return match.group(1)
            # Also check the first child div (common wrapper pattern)
            bg = card.evaluate(
                '(el) => { const d = el.querySelector("div"); return d ? window.getComputedStyle(d).backgroundImage : "none"; }'
            )
            if bg and bg != "none":
                match = re.search(r'url\(["\']?(.*?)["\']?\)', bg)
                if match and not match.group(1).startswith("data:"):
                    return match.group(1)
        except Exception:
            pass

        # 5. Data attributes on card itself
        for attr in ["data-bg", "data-image", "data-cover", "data-image-url"]:
            val = card.get_attribute(attr)
            if val and val.startswith("http"):
                return val

        return None

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

                # Scroll card into viewport so Vue's IntersectionObserver
                # fires and loads the real image URL (replaces base64 placeholder)
                card.scroll_into_view_if_needed()
                page.wait_for_timeout(300)

                # Extract cover image using fallback cascade
                image_url = self._extract_image_url(card)
                # Normalize relative URLs to absolute
                if image_url and not image_url.startswith("http"):
                    image_url = "https://allevents.in" + image_url

                logger.info(f"AllEvents: image={'found' if image_url else 'NONE'} for ...{post_url[-60:]}")

                posts.append(RawPost(
                    text=text,
                    image_url=image_url,
                    post_url=post_url,
                    source_page_name="AllEvents.in",
                ))
            except Exception as e:
                logger.debug(f"AllEvents: failed to parse card — {e}")

        return posts
