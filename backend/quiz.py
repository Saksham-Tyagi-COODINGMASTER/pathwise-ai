
import json
import random
import re
from pathlib import Path

from ai_provider import generate_with_fallback


# Locate the question bank
QUESTIONS_FILE = Path(__file__).parent / "data" / "questions.json"

VALID_DIFFICULTIES = {"easy", "medium", "hard", "adaptive"}
VALID_OPTION_KEYS = {"A", "B", "C", "D"}


def load_questions():
    """Load all questions from the JSON question bank."""

    with open(QUESTIONS_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def get_questions(course_id):
    """Return questions belonging to a particular course."""

    questions = load_questions()

    course_id = str(course_id).strip().upper()

    print("QUESTION BANK:", QUESTIONS_FILE.resolve())
    print("AVAILABLE COURSES:", list(questions.keys()))
    print("REQUESTED COURSE:", repr(course_id))
    print("QUESTIONS FOUND:", len(questions.get(course_id, [])))

    return questions.get(course_id, [])


def calculate_score(course_id, submitted_answers):
    """Calculate score using the complete local question bank."""

    questions = get_questions(course_id)

    if not questions:
        raise ValueError(f"No questions found for course: {course_id}")

    return calculate_score_for_questions(
        questions,
        submitted_answers
    )


def calculate_score_for_questions(questions, submitted_answers):
    """Calculate score against the exact questions used in a quiz."""

    if not questions:
        raise ValueError("No questions provided.")

    correct_count = 0

    for question in questions:
        question_id = question["id"]
        correct_answer = question["correct_answer"]

        submitted_answer = submitted_answers.get(question_id)

        if submitted_answer == correct_answer:
            correct_count += 1

    total_questions = len(questions)

    return {
        "correct_answers": correct_count,
        "total_questions": total_questions,
        "score_percentage": round(
            (correct_count / total_questions) * 100,
            2
        )
    }


def validate_question(question):
    """Check whether a generated question follows our question format."""

    required_fields = {
        "id",
        "skill",
        "difficulty",
        "question",
        "options",
        "correct_answer",
        "explanation"
    }

    if not isinstance(question, dict):
        return False

    if not required_fields.issubset(question.keys()):
        return False

    if not all(
        isinstance(question[field], str) and question[field].strip()
        for field in [
            "id",
            "skill",
            "question",
            "correct_answer",
            "explanation"
        ]
    ):
        return False

    difficulty = question["difficulty"].lower()

    if difficulty not in {"easy", "medium", "hard"}:
        return False

    options = question["options"]

    if not isinstance(options, dict):
        return False

    if set(options.keys()) != VALID_OPTION_KEYS:
        return False

    if not all(
        isinstance(value, str) and value.strip()
        for value in options.values()
    ):
        return False

    if question["correct_answer"] not in VALID_OPTION_KEYS:
        return False

    return True


def parse_ai_questions(content):
    """Parse and validate the AI response."""

    if not isinstance(content, str):
        return []

    # Remove optional Markdown code fences
    content = re.sub(
        r"^\s*```(?:json)?\s*|\s*```\s*$",
        "",
        content.strip(),
        flags=re.IGNORECASE
    )

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return []

    if isinstance(data, dict):
        data = data.get("questions", [])

    if not isinstance(data, list):
        return []

    valid_questions = []
    seen_ids = set()

    for question in data:
        if not validate_question(question):
            continue

        question_id = question["id"]

        if question_id in seen_ids:
            continue

        seen_ids.add(question_id)
        valid_questions.append(question)

    return valid_questions


def get_local_fallback(course_id, difficulty, num_questions):
    """Select available questions from the local question bank."""

    questions = get_questions(course_id)

    if difficulty != "adaptive":
        questions = [
            question for question in questions
            if question.get("difficulty", "").lower() == difficulty
        ]

    # Avoid duplicate question IDs
    unique_questions = {}
    for question in questions:
        unique_questions[question["id"]] = question

    questions = list(unique_questions.values())

    random.shuffle(questions)

    return questions[:num_questions]


def generate_quiz(
    course_id,
    difficulty="adaptive",
    num_questions=5,
    course_name=None,
    topics=None
):
    """
    Generate a quiz using Gemini, Groq, or the local question bank.
    """

    course_id = course_id.upper()
    difficulty = difficulty.lower()

    if difficulty not in VALID_DIFFICULTIES:
        raise ValueError(
            "Difficulty must be easy, medium, hard, or adaptive."
        )

    if not isinstance(num_questions, int) or isinstance(num_questions, bool):
        raise ValueError("Question count must be an integer.")

    if not 1 <= num_questions <= 30:
        raise ValueError("Question count must be between 1 and 30.")

    course_name = course_name or course_id
    topics = topics or []

    topic_instruction = (
        ", ".join(topics)
        if topics
        else "the main concepts and topics of this course"
    )

    prompt = f"""
Generate exactly {num_questions} original educational MCQ questions.

Course: {course_name}
Course ID: {course_id}
Topics: {topic_instruction}
Difficulty: {difficulty}

Requirements:
- Each question must have exactly four options: A, B, C, D.
- Exactly one correct answer.
- Questions must be educationally accurate.
- Avoid duplicate questions.
- For adaptive difficulty, include a suitable mixture of easy,
  medium and hard questions.
- Do not include Markdown or text outside the JSON.

Return only valid JSON in this format:

{{
  "questions": [
    {{
      "id": "AI_001",
      "skill": "Topic or skill being tested",
      "difficulty": "easy",
      "question": "Question text",
      "options": {{
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      }},
      "correct_answer": "A",
      "explanation": "Explanation of the correct answer"
    }}
  ]
}}
"""

    # Try Gemini, then Groq
    ai_result = generate_with_fallback(prompt)

     print("AI RESULT SUCCESS:", ai_result.get("success"))
     print("AI PROVIDER:", ai_result.get("provider"))
     print("AI ERROR:", ai_result.get("error"))

    
    ai_questions = []

    if ai_result["success"]:
        ai_questions = parse_ai_questions(ai_result["content"])

        # Enforce selected difficulty
        if difficulty != "adaptive":
            ai_questions = [
                question for question in ai_questions
                if question["difficulty"].lower() == difficulty
            ]

    # Keep only the requested number of AI questions
    selected_questions = ai_questions[:num_questions]

    # Fill missing questions using the local question bank
    remaining_count = num_questions - len(selected_questions)

    if remaining_count > 0:
        local_questions = get_local_fallback(
            course_id,
            difficulty,
            remaining_count
        )

        # Avoid duplicate IDs
        existing_ids = {
            question["id"] for question in selected_questions
        }

        for question in local_questions:
            if question["id"] not in existing_ids:
                selected_questions.append(question)
                existing_ids.add(question["id"])

    # No questions available
    if not selected_questions:
        return {
            "success": False,
            "provider": None,
            "fallback_used": True,
            "requested_questions": num_questions,
            "returned_questions": 0,
            "questions": [],
            "error": (
                f"No questions available for {course_id} "
                f"at {difficulty} difficulty."
            )
        }

    # Determine which sources contributed questions
    if ai_questions and len(selected_questions) > len(ai_questions):
        provider = f"{ai_result['provider']}+local"
    elif ai_questions:
        provider = ai_result["provider"]
    else:
        provider = "local"

    return {
        "success": True,
        "provider": provider,
        "fallback_used": provider != ai_result.get("provider"),
        "requested_questions": num_questions,
        "returned_questions": len(selected_questions),
        "questions": selected_questions
    }
