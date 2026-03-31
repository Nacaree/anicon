"""
Configuration for the event scraper service.
All values read from environment variables — no hardcoded secrets.
"""

import os
from dotenv import load_dotenv

# Load .env file if present (local dev); in Railway, env vars are set directly
load_dotenv()

# Supabase connection — uses service role key to bypass RLS
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Gemini AI for structured event extraction
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash"

# Rate limiting — Gemini free tier allows 15 RPM
# Set to 4s to stay safely under 15 RPM with expanded sources
GEMINI_DELAY_SECONDS = 4.0

# Source site URLs to scrape
SOURCES = {
    "allevents": {
        "urls": [
            # Anime / niche (original)
            "https://allevents.in/phnom%20penh/anime",
            "https://allevents.in/phnom%20penh/japanese",
            "https://allevents.in/phnom%20penh/cosplay",
            # General categories
            "https://allevents.in/phnom-penh/music",
            "https://allevents.in/phnom-penh/concerts",
            "https://allevents.in/phnom-penh/parties",
            "https://allevents.in/phnom-penh/festivals",
            "https://allevents.in/phnom-penh/food-drinks",
            "https://allevents.in/phnom-penh/business",
            "https://allevents.in/phnom-penh/technology",
            "https://allevents.in/phnom-penh/sports",
            "https://allevents.in/phnom-penh/health-wellness",
            "https://allevents.in/phnom-penh/performances",
            "https://allevents.in/phnom-penh/theatre",
            "https://allevents.in/phnom-penh/comedy",
            "https://allevents.in/phnom-penh/dance",
            "https://allevents.in/phnom-penh/fine-arts",
            "https://allevents.in/phnom-penh/photography",
            "https://allevents.in/phnom-penh/fashion",
            "https://allevents.in/phnom-penh/gaming",
            "https://allevents.in/phnom-penh/kids",
        ],
        "method": "playwright",
    },
    "kawaiicon": {
        "urls": ["https://khmerfes-kawaii.com"],
        "method": "beautifulsoup",
    },
    "cjcc": {
        "urls": ["https://cjcc.edu.kh"],
        "method": "beautifulsoup",
    },
    "bestofpp": {
        "urls": ["https://bestofpp.com/en/calendar"],
        "method": "beautifulsoup",
    },
    "eventbrite": {
        "urls": ["https://www.eventbrite.com/d/cambodia--phnom-penh/events/"],
        "method": "beautifulsoup",
    },
    "meetup": {
        "urls": ["https://www.meetup.com/find/?location=kh--Phnom%20Penh&source=EVENTS"],
        "method": "beautifulsoup",
    },
}
