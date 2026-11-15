
import os

from dotenv import load_dotenv
from google import genai

# Load environment variables from backend/.env
load_dotenv()

# Read Gemini API key
GEMINI_API_KEY = os.getenv("PATHWISE_GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "PATHWISE_GEMINI_API_KEY is missing from the .env file."
    )

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

# Model configuration
GEMINI_MODEL = "gemini-3.8-flash"


def generate_text(prompt: str) -> str:
    """Generate text using Gemini."""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    return response.text
