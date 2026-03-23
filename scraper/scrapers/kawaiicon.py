"""
KAWAII-CON (khmerfes-kawaii.com) scraper — WordPress site, server-rendered.
Cambodia's biggest anime event. Uses requests + BeautifulSoup.
"""

import logging
import requests
from bs4 import BeautifulSoup

from .base import BaseScraper, RawPost

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AniCon Event Scraper; +https://anicon.online)"
}


class KawaiiConScraper(BaseScraper):
    platform = "kawaiicon"

    def scrape(self) -> list[RawPost]:
        posts = []
        # Scrape main page and events/news subpages
        urls_to_try = [
            "https://khmerfes-kawaii.com",
            "https://khmerfes-kawaii.com/events",
            "https://khmerfes-kawaii.com/news",
            "https://khmerfes-kawaii.com/event",
        ]

        for url in urls_to_try:
            try:
                page_posts = self._scrape_page(url)
                posts.extend(page_posts)
                logger.info(f"KAWAII-CON: scraped {len(page_posts)} items from {url}")
            except requests.RequestException as e:
                logger.warning(f"KAWAII-CON: failed to fetch {url} — {e}")
            except Exception as e:
                logger.error(f"KAWAII-CON: error scraping {url} — {e}")

        # Deduplicate by post_url
        seen = set()
        unique = []
        for post in posts:
            if post.post_url not in seen:
                seen.add(post.post_url)
                unique.append(post)

        logger.info(f"KAWAII-CON: total {len(unique)} unique items")
        return unique

    def _scrape_page(self, url: str) -> list[RawPost]:
        """Scrape a single page for event content."""
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        posts = []

        # WordPress article tags are the primary content containers
        articles = soup.find_all("article")
        if not articles:
            # Fallback: try common WordPress content selectors
            articles = soup.select(".post, .entry, .event-item, .type-post, .type-event")

        for article in articles:
            try:
                text = article.get_text(separator=" ", strip=True)
                if not text or len(text) < 20:
                    continue

                # Find the article link
                link = article.find("a", href=True)
                post_url = link["href"] if link else url
                if not post_url.startswith("http"):
                    post_url = "https://khmerfes-kawaii.com" + post_url

                # Find the cover image (with lazy-loading fallback for WordPress)
                img = article.find("img", src=True)
                image_url = img["src"] if img else None
                if not image_url:
                    img_lazy = article.find("img", attrs={"data-src": True})
                    image_url = img_lazy["data-src"] if img_lazy else None
                if not image_url:
                    img_lazy = article.find("img", attrs={"data-lazy-src": True})
                    image_url = img_lazy["data-lazy-src"] if img_lazy else None
                # Normalize relative URLs to absolute
                if image_url and not image_url.startswith("http"):
                    image_url = "https://khmerfes-kawaii.com" + image_url
                # Skip placeholder images
                if image_url and (image_url.startswith("data:") or "1x1" in image_url):
                    image_url = None

                posts.append(RawPost(
                    text=text[:2000],
                    image_url=image_url,
                    post_url=post_url,
                    source_page_name="KAWAII-CON Cambodia",
                ))
            except Exception as e:
                logger.debug(f"KAWAII-CON: failed to parse article — {e}")

        return posts
