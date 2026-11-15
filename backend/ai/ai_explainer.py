import json
import os
import urllib.request

from ai.explainer import build_explanation


API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-haiku-5-5"
TIMEOUT_SECONDS = 6

_cache = {}

SYSTEM_PROMPT = (
    "You are the friendly voice of Pathwise AI, a personalised learning "
    "companion. You will be given a short factual summary that the backend "
    "has already computed. Rewrite it as 3 to 4 warm, encouraging sentences "
    "addressed to the student by name. Strict rules: keep every fact "
    "(course names, skills, levels, hours, quiz scores) exactly as given; do "
    "not add, remove or change any course, skill, number or recommendation; "
    "do not mention prerequisites or eligibility; do not give advice beyond "
    "the summary. Reply with the rewritten text only."
)


def _call_ai(student_name, template_text):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    body = json.dumps({
        "model": MODEL,
        "max_tokens": 300,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": (
                    f"Student name: {student_name}\n"
                    f"Summary to rewrite:\n{template_text}"
                ),
            }
        ],
    }).encode("utf-8")

    request = urllib.request.Request(
        API_URL,
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        data = json.loads(response.read().decode("utf-8"))

    text = "".join(
        block.get("text", "")
        for block in data.get("content", [])
        if block.get("type") == "text"
    ).strip()

    return text or None


def get_explanation(
    student_name,
    next_step,
    skill_gaps,
    plan_summary,
    recent_quiz_history,
):
    """
    Return {"text": ..., "source": "ai" | "template"}.
    Always builds the deterministic template first; the AI only rewrites it.
    Any failure falls back to the template.
    """
    template = build_explanation(
        student_name,
        next_step,
        skill_gaps,
        plan_summary,
        recent_quiz_history,
    )

    cache_key = (student_name, template["text"])
    if cache_key in _cache:
        return _cache[cache_key]

    result = template

    try:
        ai_text = _call_ai(student_name, template["text"])
        if ai_text:
            result = {"text": ai_text, "source": "ai"}
            _cache[cache_key] = result
    except Exception as error:
        # Never let the AI break the dashboard.
        print(f"[ai_explainer] AI call failed, using template: {error}")

    return result