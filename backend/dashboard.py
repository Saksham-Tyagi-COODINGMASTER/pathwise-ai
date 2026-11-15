
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Student
from assessment_model import Assessment
from quiz_model import QuizAttempt
from mastery import get_effective_skill_levels
from recommendations import get_recommendations
from planner import generate_learning_plan
from ai.ai_explainer import get_explanation


router = APIRouter()

TARGET_LEVEL = 3
RECENT_ATTEMPTS = 5


@router.get("/students/{student_id}/dashboard")
def get_dashboard(student_id: int, db: Session = Depends(get_db)):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    # Student summary
    student_info = {
        "id": student.id,
        "name": student.name,
        "programme": student.programme,
        "year": student.year,
        "goal": student.goal,
        "goals": student.goals or [],
        "skills": student.skills or [],
        "learning_preferences": student.learning_preferences or [],
        "completed_courses": student.completed_courses or [],
        "hours_per_week": student.hours_per_week,
    }

    # Recent quiz history (newest first)
    attempts_query = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id
    )

    total_attempts = attempts_query.count()

    recent_attempts = (
        attempts_query
        .order_by(
            QuizAttempt.created_at.desc(),
            QuizAttempt.id.desc(),
        )
        .limit(RECENT_ATTEMPTS)
        .all()
    )

    recent_quiz_history = [
        {
            "attempt_id": attempt.id,
            "course_id": attempt.course_id,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "created_at": attempt.created_at,
        }
        for attempt in recent_attempts
    ]

    # Latest assessment
    assessment = (
        db.query(Assessment)
        .filter(Assessment.student_id == student_id)
        .order_by(Assessment.id.desc())
        .first()
    )

    # Handle students who have not completed an assessment
    if not assessment:
        return {
            "student": student_info,
            "has_assessment": False,
            "message": (
                "Complete your skill assessment to unlock "
                "personalised recommendations."
            ),
            "explanation": None,
            "ai_advice": {
                "text": (
                    "Complete your skill assessment so Pathwise AI "
                    "can understand your strengths, interests and "
                    "learning priorities."
                ),
                "source": "template",
                "interests": [],
                "focus_areas": [],
                "courses": [],
            },
            "interests": [],
            "skills": [],
            "skill_gaps": [],
            "next_step": None,
            "recommended_courses": [],
            "review_completed": [],
            "blocked_courses": [],
            "plan_summary": None,
            "total_quiz_attempts": total_attempts,
            "recent_quiz_history": recent_quiz_history,
        }

    # Blended skill levels:
    # self-assessment + actual quiz mastery
    levels = get_effective_skill_levels(
        db,
        student_id,
        assessment.skill_levels or {},
    )

    skills = [
        {
            "skill": skill,
            **detail,
        }
        for skill, detail in levels.items()
    ]

    # Identify skills below target level
    skill_gaps = [
        {
            "skill": item["skill"],
            "current_level": item["effective_level"],
            "target_level": TARGET_LEVEL,
            "gap": round(
                TARGET_LEVEL - item["effective_level"],
                2,
            ),
            "level_source": item["source"],
        }
        for item in skills
        if item["effective_level"] < TARGET_LEVEL
    ]

    skill_gaps.sort(
        key=lambda item: item["gap"],
        reverse=True,
    )

    # Existing course recommendation logic remains unchanged
    recs = get_recommendations(
        student_id,
        db,
    )

    # Generate the personalised learning plan
    plan = generate_learning_plan(
        student,
        assessment,
        levels,
    )

    plan_courses = plan.get("courses", [])

    allocated_hours = round(
        sum(
            float(item.get("estimated_hours", 0))
            for item in plan_courses
        ),
        2,
    )

    # Keep the structure expected by the AI explainer
    plan_summary = {
        "available_hours": plan.get("total_hours", 0),
        "allocated_hours": allocated_hours,
        "courses": [
            {
                "course_name": item.get("course_name", "Study practice"),
                "skill": item.get("skill"),
                "estimated_hours": item.get("estimated_hours", 0),
                "reason": item.get("reason", ""),
                "matched_interests": item.get(
                    "matched_interests",
                    [],
                ),
                "current_level": item.get("current_level"),
                "target_level": item.get("target_level"),
            }
            for item in plan_courses
        ],
    }

    # Generate the factual explanation.
    # Claude rewrites this when configured; otherwise the
    # deterministic template remains available.
    explanation = get_explanation(
        student.name,
        recs.get("next_step"),
        skill_gaps,
        plan_summary,
        recent_quiz_history,
    )

    interests = assessment.interests or []

    # Structured data for the Dashboard AI Advice section
    ai_advice = {
        "text": explanation.get("text", ""),
        "source": explanation.get("source", "template"),
        "interests": interests,
        "focus_areas": plan.get("focus_areas", []),
        "courses": plan_summary["courses"],
        "available_hours": plan_summary["available_hours"],
        "allocated_hours": plan_summary["allocated_hours"],
        "message": plan.get("message", ""),
    }

    return {
        "student": student_info,
        "has_assessment": True,

        "interests": interests,

        "skills": skills,
        "skill_gaps": skill_gaps,

        "next_step": recs.get("next_step"),
        "recommended_courses": recs.get(
            "recommended_courses",
            [],
        ),
        "review_completed": recs.get(
            "review_completed",
            [],
        ),
        "blocked_courses": recs.get(
            "blocked_courses",
            [],
        ),

        "plan_summary": plan_summary,

        "explanation": explanation,
        "ai_advice": ai_advice,

        "total_quiz_attempts": total_attempts,
        "recent_quiz_history": recent_quiz_history,
    }
