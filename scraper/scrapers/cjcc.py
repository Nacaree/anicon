"""
CJCC (Cambodia-Japan Cooperation Center) scraper — WordPress/Elementor, server-rendered.
Japanese cultural events (Kizuna Festival, Tanabata, etc.). Uses requests + BeautifulSoup.
"""

import logging
import requests
from bs4 import BeautifulSoup

from .base import BaseScraper, RawPost

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AniCon Event Scraper; +https://anicon.online)"
}


class CJCCScraper(BaseScraper):
    platform = "cjcc"

    def scrape(self) -> list[RawPost]:
        posts = []
        # Scrape the main page and events-related subpages
        urls_to_try = [
            "https://cjcc.edu.kh",
            "https://cjcc.edu.kh/events",
            "https://cjcc.edu.kh/event",
            "https://cjcc.edu.kh/category/events",
        ]

        for url in urls_to_try:
            try:
                page_posts = self._scrape_page(url)
                posts.extend(page_posts)
                logger.info(f"CJCC: scraped {len(page_posts)} items from {url}")
            except requests.RequestException as e:
                logger.warning(f"CJCC: failed to fetch {url} — {e}")
            except Exception as e:
                logger.error(f"CJCC: error scraping {url} — {e}")

        # Deduplicate by post_url
        seen = set()
        unique = []
        for post in posts:
            if post.post_url not in seen:
                seen.add(post.post_url)
                unique.append(post)

        logger.info(f"CJCC: total {len(unique)} unique items")
        return unique

    def _scrape_page(self, url: str) -> list[RawPost]:
        """Scrape a single CJCC page for event content."""
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")
        posts = []

        # CJCC uses Elementor — look for posts, articles, and event cards
        articles = soup.find_all("article")
        if not articles:
            articles = soup.select(
                ".elementor-post, .elementor-element, .post, .event-item, .entry"
            )

        for article in articles:
            try:
                text = article.get_text(separator=" ", strip=True)
                if not text or len(text) < 20:
                    continue

                # Find the article link
                link = article.find("a", href=True)
                post_url = link["href"] if link else url
                if not post_url.startswith("http"):
                    post_url = "https://cjcc.edu.kh" + post_url

                # Find the cover image
                img = article.find("img", src=True)
                image_url = img["src"] if img else None
                # Elementor sometimes uses data-src for lazy loading
                if not image_url:
                    img_lazy = article.find("img", attrs={"data-src": True})
                    image_url = img_lazy["data-src"] if img_lazy else None

                posts.append(RawPost(
                    text=text[:2000],
                    image_url=image_url,
                    post_url=post_url,
                    source_page_name="CJCC",
                ))
            except Exception as e:
                logger.debug(f"CJCC: failed to parse article — {e}")

        return posts
