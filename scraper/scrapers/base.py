"""
Base scraper ABC — all source scrapers inherit from this.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class RawPost:
    """A raw scraped post/listing before AI extraction."""
    text: str                    # Raw text content of the listing
    image_url: str | None        # Cover image URL if found
    post_url: str                # Direct URL to this listing (dedup key)
    source_page_name: str | None # Name of the page/organizer


class BaseScraper(ABC):
    """
    Abstract base for all source scrapers.
    Each subclass implements scrape() which returns a list of RawPost objects.
    """

    platform: str = ""  # Source platform identifier (e.g. "allevents", "kawaiicon")

    @abstractmethod
    def scrape(self) -> list[RawPost]:
        """Scrape the source site and return raw post data for AI extraction."""
        ...
