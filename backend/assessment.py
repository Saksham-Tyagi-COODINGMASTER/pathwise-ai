
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Dict, List
from sqlalchemy import desc

from database import get_db
from models import Student
from assessment_model import Assessment


router = APIRouter()


class AssessmentInput(BaseModel):
    skill_levels: Dict[str, int]
    interests: List[str]
    confidence_levels: Dict[str, int]
    available_hours: int = Field(gt=0, le=168)


def validate_ratings(ratings: Dict[str, int], rating_type: str):
    for course, level in ratings.items():
        if level not in (-1, 0, 1, 2, 3, 4, 5):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid {rating_type} for {course}. "
                    "Use 0 to 5 or -1 for Pass / No Pass."
                )
            )


@router.post("/students/{student_id}/assessment")
def submit_assessment(
    student_id: int,
    data: AssessmentInput,
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    validate_ratings(data.skill_levels, "knowledge rating")
    validate_ratings(data.confidence_levels, "confidence rating")

    assessment = Assessment(
        student_id=student_id,
        skill_levels=data.skill_levels,
        interests=data.interests,
        confidence_levels=data.confidence_levels,
        available_hours=data.available_hours
    )

    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return {
        "message": "Assessment submitted successfully",
        "assessment_id": assessment.id,
        "student_id": student_id
    }


@router.get("/students/{student_id}/assessment/history")
def get_assessment_history(
    student_id: int,
    db: Session = Depends(get_db)
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    assessments = (
        db.query(Assessment)
        .filter(Assessment.student_id == student_id)
        .order_by(desc(Assessment.created_at))
        .all()
    )

    return {
        "student_id": student_id,
        "total_assessments": len(assessments),
        "assessments": [
            {
                "id": assessment.id,
                "skill_levels": assessment.skill_levels,
                "confidence_levels": assessment.confidence_levels,
                "interests": assessment.interests,
                "available_hours": assessment.available_hours,
                "created_at": assessment.created_at
            }
            for assessment in assessments
        ]
    }
