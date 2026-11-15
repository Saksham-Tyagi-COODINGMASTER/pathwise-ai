
import os
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

GROQ_API_KEY = os.getenv("PATHWISE_GROQ_API_KEY")
GROQ_MODEL = os.getenv("PATHWISE_GROQ_MODEL")


def generate_text(prompt: str) -> str:
    """Generate text using the official Groq SDK."""

    if not GROQ_API_KEY:
        raise RuntimeError("PATHWISE_GROQ_API_KEY is missing.")

    if not GROQ_MODEL:
        raise RuntimeError("PATHWISE_GROQ_MODEL is missing.")

    client = Groq(api_key=GROQ_API_KEY)

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=3000,
    )

    content = response.choices[0].message.content

    if not content or not content.strip():
        raise RuntimeError("Groq returned an empty response.")

    return content.strip()
