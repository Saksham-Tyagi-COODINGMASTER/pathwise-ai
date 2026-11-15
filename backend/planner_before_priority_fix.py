import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Student
from assessment_model import Assessment
from prerequisites import check_prerequisites
from mastery import get_effective_skill_levels


router = APIRouter()

COURSE_FILE = Path(__file__).parent / "data" / "courses.json"
TARGET_LEVEL = 3
MAX_HOURS_PER_COURSE = 10
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def load_courses():
    with open(COURSE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def generate_learning_plan(student, assessment, effective_levels=None):
    """
    Generate deterministic course recommendations from skill gaps.

    effective_levels: output of get_effective_skill_levels() (self-assessment
    blended with quiz mastery). If None, falls back to self-assessed levels.
    """

    courses = load_courses()
    completed_courses = list(student.completed_courses or [])
    completed_normalized = {
        str(item).strip().casefold() for item in completed_courses
    }
    self_levels = assessment.skill_levels or {}
    available_hours = assessment.available_hours

    recommendations = []
    weekly_plan = []
    remaining_hours = available_hours

    for course in courses:
        course_id = course["course_id"]
        course_name = course["course_name"]

        # Skip courses already completed (accept IDs or course names).
        if (
            course_id.strip().casefold() in completed_normalized
            or course_name.strip().casefold() in completed_normalized
        ):
            continue

        # Academic eligibility is decided by deterministic backend rules.
        eligibility = check_prerequisites(course_id, completed_courses)
        if not eligibility["valid"]:
            continue

        relevant_gaps = []

        for skill in course.get("skills", []):
            if effective_levels is not None:
                detail = effective_levels.get(skill)
            else:
                detail = None

            if detail:
                current_level = detail["effective_level"]
                self_level = detail["self_assessed_level"]
                quiz_level = detail["quiz_level"]
                source = detail["source"]
            else:
                current_level = self_levels.get(skill, 0)
                self_level = self_levels.get(skill, 0)
                quiz_level = None
                source = "self_assessment"

            if current_level < TARGET_LEVEL:
                relevant_gaps.append({
                    "skill": skill,
                    "current_level": current_level,
                    "target_level": TARGET_LEVEL,
                    "gap": round(TARGET_LEVEL - current_level, 2),
                    "self_assessed_level": self_level,
                    "quiz_level": quiz_level,
                    "level_source": source
                })

        if relevant_gaps and remaining_hours > 0:
            priority_score = round(sum(gap["gap"] for gap in relevant_gaps), 2)
            allocated_hours = min(MAX_HOURS_PER_COURSE, remaining_hours)

            weekly_plan.append({
                "course_id": course_id,
                "course_name": course_name,
                "total_hours": allocated_hours,
                "daily_schedule": [
                    {
                        "day": day,
                        "hours": round(allocated_hours / len(WEEKDAYS), 2)
                    }
                    for day in WEEKDAYS
                ]
            })

            recommendations.append({
                "course_id": course_id,
                "course_name": course_name,
                "credits": course["credits"],
                "priority_score": priority_score,
                "reason": "This course addresses your current skill gaps.",
                "skill_gaps": relevant_gaps,
                "estimated_hours": allocated_hours
            })

            remaining_hours -= allocated_hours

    recommendations.sort(
        key=lambda item: item["priority_score"],
        reverse=True
    )

    return {
        "recommendations": recommendations,
        "available_hours": available_hours,
        "weekly_plan": weekly_plan
    }


@router.post("/students/{student_id}/generate-plan")
def create_learning_plan(
    student_id: int,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    assessment = (
        db.query(Assessment)
        .filter(Assessment.student_id == student_id)
        .order_by(Assessment.id.desc())
        .first()
    )

    if not assessment:
        raise HTTPException(
            status_code=404,
            detail="Student assessment not found"
        )

    effective_levels = get_effective_skill_levels(
        db, student_id, assessment.skill_levels
    )

    plan = generate_learning_plan(student, assessment, effective_levels)

    return {
        "message": "Learning plan generated successfully",
        "student_id": student_id,
        "student_name": student.name,
        "plan": plan
    }