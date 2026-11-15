"""
Curriculum-aware question generator for Pathwise AI.
Writes ONLY to data/questions_new.json (never touches questions.json).

Pilot:
  python scripts/generate_bank.py --branch CSE --code CS101C --count 100
"""
import argparse
import json
import os
import random
import re
import time
from pathlib import Path

from google import genai
from google.genai import types

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CURRICULA = DATA_DIR / "iit_dharwad_curricula.json"
EXISTING = DATA_DIR / "questions.json"
OUTPUT = DATA_DIR / "questions_new.json"

MODEL = os.getenv("PATHWISE_QUIZ_MODEL", "gemini-2.5-flash")
BATCH = 10
SPLIT = {"easy": 0.35, "medium": 0.40, "hard": 0.25}
LETTERS = ["A", "B", "C", "D"]


def norm(t):
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def find_course(branch, code):
    data = json.loads(CURRICULA.read_text(encoding="utf-8"))["curricula"]
    for c in data[branch]["courses"]:
        if c.get("code") == code:
            return c
    raise SystemExit(f"{code} not found in {branch}")


def prompt(course, difficulty, n):
    return f"""You are writing multiple-choice questions for an IIT Dharwad course.

Course code: {course['code']}
Course name: {course['name']}
Semester: {course.get('semester')}
Difficulty: {difficulty}
Number of questions: {n}

Rules:
- Cover topics a standard university course with this exact name would teach.
  Do NOT claim these are official exam questions.
- Exactly 4 options, exactly ONE correct. Facts and arithmetic must be correct.
- easy = recall/definitions; medium = apply a concept or short calculation;
  hard = multi-step reasoning or tricky edge cases.
- No near-duplicates. Spread across different topics of the course.
- "skill": a short topic area (e.g. "Pointers"). "tags": 2-4 lowercase tags.
- "explanation": 1-2 sentences, must justify the correct option.

Return ONLY a JSON array of objects shaped like:
{{"skill": "...", "tags": ["..."], "question": "...",
  "options": ["...", "...", "...", "..."], "correct_index": 0,
  "explanation": "..."}}"""


def validate(item):
    try:
        q = str(item["question"]).strip()
        opts = [str(o).strip() for o in item["options"]]
        idx = int(item["correct_index"])
        exp = str(item["explanation"]).strip()
        skill = str(item.get("skill", "General")).strip() or "General"
        tags = [str(t).strip().lower() for t in item.get("tags", []) if str(t).strip()][:4]
    except (KeyError, TypeError, ValueError):
        return None
    if not q or not exp or len(opts) != 4 or len(set(opts)) != 4:
        return None
    if any(not o for o in opts) or not 0 <= idx <= 3:
        return None
    return q, opts, idx, exp, skill, tags


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--branch", required=True)
    ap.add_argument("--code", required=True)
    ap.add_argument("--count", type=int, default=100)
    a = ap.parse_args()

    key = os.getenv("PATHWISE_GEMINI_API_KEY")
    if not key:
        raise SystemExit("PATHWISE_GEMINI_API_KEY is not set")
    client = genai.Client(api_key=key)

    course = find_course(a.branch, a.code)
    code = course["code"].upper()
    existing = json.loads(EXISTING.read_text(encoding="utf-8")) if EXISTING.exists() else {}
    seen = {norm(q["question"]) for q in existing.get(code, [])}
    results, number = [], len(existing.get(code, [])) + 1

    for difficulty, share in SPLIT.items():
        target, got, tries = round(a.count * share), 0, 0
        while got < target and tries < 8:
            tries += 1
            n = min(BATCH, target - got)
            try:
                resp = client.models.generate_content(
                    model=MODEL,
                    contents=prompt(course, difficulty, n + 2),
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json", temperature=0.9),
                )
                items = json.loads(resp.text)
            except Exception as err:
                print(f"  batch failed ({difficulty}): {err}")
                time.sleep(3)
                continue
            for item in items:
                if got >= target:
                    break
                v = validate(item)
                if not v or norm(v[0]) in seen:
                    continue
                q, opts, idx, exp, skill, tags = v
                seen.add(norm(q))
                correct = opts[idx]
                random.shuffle(opts)
                results.append({
                    "id": f"{code}_Q{number}",
                    "skill": skill,
                    "tags": tags,
                    "difficulty": difficulty,
                    "question": q,
                    "options": dict(zip(LETTERS, opts)),
                    "correct_answer": LETTERS[opts.index(correct)],
                    "explanation": exp,
                    "source": "ai_generated",
                    "verification_status": "unverified",
                })
                number += 1
                got += 1
            time.sleep(1)
        print(f"{difficulty}: {got}/{target}")

    OUTPUT.write_text(json.dumps({code: results}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved {len(results)} questions under key {code} -> {OUTPUT}")


if __name__ == "__main__":
    main()