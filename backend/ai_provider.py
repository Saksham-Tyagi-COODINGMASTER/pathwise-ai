
"""AI provider fallback: Gemini first, then Groq."""

def generate_with_fallback(prompt: str) -> dict:
    """
    Try Gemini first. If Gemini fails, try Groq.
    Return a consistent response containing provider errors.
    """

    errors = {
        "gemini": None,
        "groq": None
    }

    # -----------------------------------------
    # 1. Try Gemini
    # -----------------------------------------
    try:
        from gemini_client import generate_text

        result = generate_text(prompt)

        if not isinstance(result, str) or not result.strip():
            raise ValueError("Gemini returned an empty or invalid response.")

        print("Gemini generation successful.", flush=True)

        return {
            "success": True,
            "provider": "gemini",
            "content": result.strip(),
            "errors": errors,
            "error": None
        }

    except Exception as error:
        errors["gemini"] = str(error)

        print(f"Gemini failed: {error}", flush=True)
        print("Trying Groq...", flush=True)

    # -----------------------------------------
    # 2. Try Groq
    # -----------------------------------------
    try:
        from groq_client import generate_text

        result = generate_text(prompt)

        if not isinstance(result, str) or not result.strip():
            raise ValueError("Groq returned an empty or invalid response.")

        print("Groq generation successful.", flush=True)

        return {
            "success": True,
            "provider": "groq",
            "content": result.strip(),
            "errors": errors,
            "error": None
        }

    except Exception as error:
        errors["groq"] = str(error)

        print(f"Groq failed: {error}", flush=True)

    # -----------------------------------------
    # 3. Both providers failed
    # -----------------------------------------
    combined_error = (
        f"Gemini failed: {errors['gemini']} | "
        f"Groq failed: {errors['groq']}"
    )

    print("All AI providers failed.", flush=True)
    print(combined_error, flush=True)

    return {
        "success": False,
        "provider": None,
        "content": None,
        "errors": errors,
        "error": combined_error
    }
