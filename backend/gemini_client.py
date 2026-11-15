
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

# Load backend/.env explicitly
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

GEMINI_API_KEY = os.getenv("PATHWISE_GEMINI_API_KEY")

GEMINI_MODEL = "gemini-3.8-flash"


def generate_text(prompt: str) -> str:
    """Generate text using Gemini."""

    if not GEMINI_API_KEY:
        raise RuntimeError("PATHWISE_GEMINI_API_KEY is missing.")

    client = genai.Client(api_key=GEMINI_API_KEY)

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )

    content = response.text

    if not content or not content.strip():
        raise RuntimeError("Gemini returned an empty response.")

    return content.strip()
