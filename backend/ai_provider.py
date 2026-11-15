
def generate_with_fallback(prompt: str) -> dict:
    errors = {
        "gemini": None,
        "groq": None
    }

    # First provider: Gemini
    try:
        from gemini_client import generate_text

        result = generate_text(prompt)

        if not result or not isinstance(result, str):
            raise ValueError("Gemini returned an empty or invalid response.")

        return {
            "success": True,
            "provider": "gemini",
            "content": result,
            "errors": errors,
            "error": None
        }

    except Exception as error:
        errors["gemini"] = str(error)
        print(f"Gemini failed: {error}", flush=True)
        print("Trying Groq...", flush=True)

    # Second provider: Groq
    try:
        from groq_client import generate_text

        result = generate_text(prompt)

        if not result or not isinstance(result, str):
            raise ValueError("Groq returned an empty or invalid response.")

        return {
            "success": True,
            "provider": "groq",
            "content": result,
            "errors": errors,
            "error": None
        }

    except Exception as error:
        errors["groq"] = str(error)
        print(f"Groq failed: {error}", flush=True)

    return {
        "success": False,
        "provider": None,
        "content": None,
        "errors": errors,
        "error": (
            f"Gemini: {errors['gemini']} | "
            f"Groq: {errors['groq']}"
        )
    }

