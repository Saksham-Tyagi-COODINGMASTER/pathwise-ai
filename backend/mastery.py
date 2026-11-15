from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Student
from quiz_model import QuizAttempt
from quiz import load_questions


router = APIRouter()

DIFFICULTY_WEIGHTS = {"easy": 1, "medium": 2, "hard": 3}
RECENCY_DECAY = 0.7  # each older attempt counts 70% of the next newer one


def _question_lookup():
    """Build {question_id: question_dict} from questions.json."""
    lookup = {}
    for course_questions in load_questions().values():
        for question in course_questions:
            lookup[question["id"]] = question
    return lookup


def _status(percent):
    if percent < 40:
        return "beginner"
    if percent < 70:
        return "developing"
    if percent < 90:
        return "proficient"
    return "mastered"


def _evidence_confidence(question_count):
    if question_count < 3:
        return "low"
    if question_count < 6:
        return "medium"
    return "high"


def calculate_mastery(attempts):
    """
    attempts must be ordered NEWEST FIRST.
    Returns {skill_name: {...mastery details...}}.
    """
    lookup = _question_lookup()
    totals = {}

    for age, attempt in enumerate(attempts):
        recency_weight = RECENCY_DECAY ** age
        answers = attempt.answers if isinstance(attempt.answers, dict) else {}

        question_ids = attempt.questions or list(answers.keys())

        for item in question_ids:
            question_id = item.get("id") if isinstance(item, dict) else item
            question = lookup.get(question_id)
            if not question:
                continue

            skill = question["skill"]
            weight = DIFFICULTY_WEIGHTS.get(question["difficulty"], 1) * recency_weight
            is_correct = answers.get(question_id) == question["correct_answer"]

            entry = totals.setdefault(
                skill,
                {"earned": 0.0, "possible": 0.0, "answered": 0, "correct": 0},
            )
            entry["possible"] += weight
            entry["answered"] += 1
            if is_correct:
                entry["earned"] += weight
                entry["correct"] += 1

    result = {}
    for skill, entry in totals.items():
        percent = round(entry["earned"] / entry["possible"] * 100, 1)
        result[skill] = {
            "mastery_percent": percent,
            "level_0_to_5": round(percent / 20),
            "status": _status(percent),
            "questions_answered": entry["answered"],
            "questions_correct": entry["correct"],
            "evidence_confidence": _evidence_confidence(entry["answered"]),
        }
    return result


@router.get("/students/{student_id}/mastery")
def get_mastery(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.student_id == student_id)
        .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
        .all()
    )

    return {
        "student_id": student_id,
        "total_attempts": len(attempts),
        "how_calculated": (
            "Per skill: points earned / points possible. Difficulty weights "
            "easy=1, medium=2, hard=3. Each older attempt counts 0.7x the "
            "next newer one. Level = mastery% / 20, rounded."
        ),
        "skills": calculate_mastery(attempts),
    }
EVIDENCE_QUIZ_WEIGHT = {"low": 0.5, "medium": 0.7, "high": 0.9}


def get_effective_skill_levels(db, student_id, assessment_levels):
    """
    Blend self-assessed levels with quiz mastery.
    Returns {skill: {self_assessed_level, quiz_level, effective_level, source}}.
    """
    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.student_id == student_id)
        .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
        .all()
    )

    mastery = calculate_mastery(attempts)
    mastery_lookup = {
        name.strip().casefold(): data for name, data in mastery.items()
    }

    assessment_levels = assessment_levels or {}
    details = {}

    for skill, self_level in assessment_levels.items():
        quiz_data = mastery_lookup.get(skill.strip().casefold())

        if quiz_data is None:
            details[skill] = {
                "self_assessed_level": self_level,
                "quiz_level": None,
                "effective_level": float(self_level),
                "source": "self_assessment",
            }
        else:
            quiz_level = quiz_data["mastery_percent"] / 20
            weight = EVIDENCE_QUIZ_WEIGHT[quiz_data["evidence_confidence"]]
            effective = round(weight * quiz_level + (1 - weight) * self_level, 2)
            details[skill] = {
                "self_assessed_level": self_level,
                "quiz_level": round(quiz_level, 2),
                "effective_level": effective,
                "source": "blended",
            }

    assessed_names = {name.strip().casefold() for name in assessment_levels}
    for skill, quiz_data in mastery.items():
        if skill.strip().casefold() not in assessed_names:
            quiz_level = round(quiz_data["mastery_percent"] / 20, 2)
            details[skill] = {
                "self_assessed_level": None,
                "quiz_level": quiz_level,
                "effective_level": quiz_level,
                "source": "quiz_only",
            }

    return details