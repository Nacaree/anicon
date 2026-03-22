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
GEMINI_DELAY_SECONDS = 0.5

# Source site URLs to scrape
SOURCES = {
    "allevents": {
        "urls": [
            "https://allevents.in/phnom%20penh/anime",
            "https://allevents.in/phnom%20penh/japanese",
            "https://allevents.in/phnom%20penh/cosplay",
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
}

# Keywords to filter Best of PP results before sending to Gemini
# (this site covers all event types, not just anime/Japanese)
BESTOFPP_KEYWORDS = [
    "anime", "manga", "cosplay", "japanese", "japan",
    "otaku", "kawaii", "vocaloid", "naruto", "genshin",
    "one piece", "jujutsu", "dragon ball", "gundam",
    "convention", "con", "kizuna", "tanabata", "matsuri",
]
