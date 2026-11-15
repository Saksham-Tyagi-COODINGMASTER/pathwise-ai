import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from mastery import get_effective_skill_levels
from database import get_db
from models import Student
from assessment_model import Assessment


router = APIRouter()

COURSE_FILE = Path(__file__).parent / "data" / "courses.json"


def load_courses():
    with open(COURSE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


@router.get("/courses")
def get_courses():
    return load_courses()

@router.get("/courses/{course_id}/resources")
def get_course_resources(course_id: str):
    courses = load_courses()

    course = next(
        (
            item for item in courses
            if item["course_id"].casefold() == course_id.casefold()
        ),
        None
    )

    if course is None:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )

    return {
        "course_id": course["course_id"],
        "course_name": course["course_name"],
        "resources": course.get("resources", [])
    }



@router.get("/students/{student_id}/skill-gap")
def get_skill_gap(
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

    courses = load_courses()

    skill_details = get_effective_skill_levels(
        db, student_id, assessment.skill_levels
    )

    skill_gaps = []

    for course in courses:
        for skill in course["skills"]:
            detail = skill_details.get(skill)
            current_level = detail["effective_level"] if detail else 0

            if current_level < 3:
                skill_gaps.append({
                    "skill": skill,
                    "current_level": current_level,
                    "target_level": 3,
                    "gap": round(3 - current_level, 2),
                    "related_course": course["course_name"],
                    "self_assessed_level": detail["self_assessed_level"] if detail else None,
                    "quiz_level": detail["quiz_level"] if detail else None,
                    "level_source": detail["source"] if detail else "no_data"
                })

    return {
        "student_id": student_id,
        "skill_gaps": skill_gaps
    }