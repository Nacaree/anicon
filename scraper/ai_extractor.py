"""
Gemini 2.5 Flash AI extractor for structured event data.
Takes raw scraped text and returns structured JSON with event details.
Uses JSON response mode for reliable structured output.
"""

import json
import time
import logging
from google import genai
from google.genai import types

from config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_DELAY_SECONDS

logger = logging.getLogger(__name__)

# Initialize the Gemini client
client = None


def get_client():
    """Lazy-init the Gemini client."""
    global client
    if client is None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY must be set")
        client = genai.Client(api_key=GEMINI_API_KEY)
    return client


EXTRACTION_PROMPT = """Analyze this text from a Cambodia event listing page.
If this is an event announcement, extract the structured data.
If this is NOT an event (e.g. a general post, ad, article, or navigation text), set is_event to false.

Text:
{text}

Source: {source_name}

Respond with JSON only. Schema:
{{
  "is_event": boolean,
  "title": string or null,
  "description": string or null,
  "event_date": "YYYY-MM-DD" or null,
  "event_time": "HH:MM" or null,
  "end_time": "HH:MM" or null,
  "location": string or null,
  "tags": [string] (relevant tags like "anime", "cosplay", "japanese", etc.)
}}
"""


def extract_event(text: str, source_name: str) -> dict | None:
    """
    Send text to Gemini 2.5 Flash and extract structured event data.
    Returns a dict with event fields if it's an event, None otherwise.

    Rate-limited to respect Gemini free tier (15 RPM).
    """
    if not text or not text.strip():
        return None

    try:
        gemini = get_client()
        prompt = EXTRACTION_PROMPT.format(text=text[:3000], source_name=source_name)

        response = gemini.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        # Rate limit — sleep between calls to stay within 15 RPM
        time.sleep(GEMINI_DELAY_SECONDS)

        # Parse the JSON response
        result_text = response.text.strip()
        result = json.loads(result_text)

        # Gemini sometimes returns a JSON array instead of an object — unwrap it
        if isinstance(result, list):
            if len(result) > 0 and isinstance(result[0], dict):
                result = result[0]
            else:
                return None

        # Check if Gemini determined this is an event
        if not result.get("is_event"):
            return None

        # Must have at least a title
        if not result.get("title"):
            return None

        return {
            "title": result.get("title"),
            "description": result.get("description"),
            "event_date": result.get("event_date"),
            "event_time": result.get("event_time"),
            "end_time": result.get("end_time"),
            "location": result.get("location"),
            "tags": result.get("tags", []),
        }

    except json.JSONDecodeError as e:
        logger.warning(f"Gemini returned invalid JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Gemini extraction failed: {e}")
        # Sleep on error to avoid hammering the API
        time.sleep(GEMINI_DELAY_SECONDS)
        return None
