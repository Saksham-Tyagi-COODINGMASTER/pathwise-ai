
def generate_with_fallback(prompt: str) -> dict:
    errors = {
        "gemini": None,
        "groq": None
    }

    # First provider: Gemini
    try:
        from gemini_client import generate_text

        result = generate_text(prompt)

        return {
            "success": True,
            "provider": "gemini",
            "content": result,
            "errors": errors
        }

    except Exception as error:
        errors["gemini"] = str(error)
        print(f"Gemini failed: {error}")
        print("Trying Groq...")

    # Second provider: Groq
    try:
        from groq_client import generate_text

        result = generate_text(prompt)

        return {
            "success": True,
            "provider": "groq",
            "content": result,
            "errors": errors
        }

    except Exception as error:
        errors["groq"] = str(error)
        print(f"Groq failed: {error}")

    return {
        "success": False,
        "provider": None,
        "content": None,
        "errors": errors
    }
