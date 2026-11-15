
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Student, StudentCourseProgress
from assessment_model import Assessment
from curriculum import CURRICULA, get_effective_semester


router = APIRouter()

TARGET_LEVEL = 3
MAX_HOURS_PER_COURSE = 10
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


# Maps profile display names to the keys used in the curriculum JSON.
BRANCH_ALIASES = {
    "electrical and electronics engineering": "EEE",
    "electrical & electronics engineering": "EEE",
    "eee": "EEE",

    "computer science and engineering": "CSE",
    "computer science & engineering": "CSE",
    "cse": "CSE",

    "electronics and communication engineering": "ECE",
    "electronics & communication engineering": "ECE",
    "ece": "ECE",

    "electrical engineering": "EE",
    "ee": "EE",

    "mechanical engineering": "Mechanical Engineering",
    "me": "Mechanical Engineering",

    "engineering physics": "Engineering Physics",

    "mathematics and computing": "Mathematics and Computing",
    "mathematics & computing": "Mathematics and Computing",

    "chemical and biochemical engineering": "Chemical and Biochemical Engineering",
    "chemical & biochemical engineering": "Chemical and Biochemical Engineering",

    "civil and infrastructure engineering": "Civil and Infrastructure Engineering",
    "civil & infrastructure engineering": "Civil and Infrastructure Engineering",
}


def normalize_branch_name(branch):
    return " ".join(str(branch or "").strip().casefold().split())


def get_branch_curriculum(branch):
    if not branch:
        raise HTTPException(
            status_code=404,
            detail="Your branch is missing from your student profile."
        )

    curricula = CURRICULA.get("curricula", {})
    requested_branch = str(branch).strip()

    # First try the exact curriculum key.
    if requested_branch in curricula:
        return requested_branch, curricula[requested_branch]

    # Then resolve known profile display names and abbreviations.
    alias_key = normalize_branch_name(requested_branch)
    canonical_branch = BRANCH_ALIASES.get(alias_key)

    if canonical_branch and canonical_branch in curricula:
        return canonical_branch, curricula[canonical_branch]

    # Finally, try a case-insensitive match against actual curriculum keys.
    for curriculum_key, branch_data in curricula.items():
        if normalize_branch_name(curriculum_key) == alias_key:
            return curriculum_key, branch_data

    available_branches = ", ".join(str(key) for key in curricula.keys())

    raise HTTPException(
        status_code=404,
        detail=(
            f"Curriculum not found for branch: {requested_branch}. "
            f"Available curriculum branches: {available_branches}"
        )
    )


def is_completion_course(course):
    credit_type = str(course.get("credit_type") or "").casefold()

    if "pass/no pass" in credit_type or "pass no pass" in credit_type:
        return True

    name = str(course.get("name") or "").upper()

    return any(
        term in name.split("/")
        or name.startswith(term + " ")
        or name == term
        for term in ("NSO", "NSS", "NCC", "NCA")
    )


def is_marked_pass_no_pass(course, assessment):
    course_name = course.get("name")

    if not course_name:
        return False

    knowledge = assessment.skill_levels or {}
    confidence = assessment.confidence_levels or {}

    return (
        knowledge.get(course_name) == -1
        or confidence.get(course_name) == -1
    )


def get_student_curriculum(student):
    _, branch_data = get_branch_curriculum(student.branch)

    semester = get_effective_semester(student)

    courses = [
        course
        for course in branch_data.get("courses", [])
        if (
            course.get("semester") == semester
            and course.get("status") == "verified"
            and course.get("name")
            and not course.get("is_elective", False)
        )
    ]

    return semester, courses


def get_completed_course_keys(db, student):
    completed = {
        str(item).strip().casefold()
        for item in (student.completed_courses or [])
    }

    progress_rows = (
        db.query(StudentCourseProgress)
        .filter(
            StudentCourseProgress.student_id == student.id,
            StudentCourseProgress.completed.is_(True)
        )
        .all()
    )

    completed.update(
        row.course_key.strip().casefold()
        for row in progress_rows
        if row.course_key
    )

    return completed


def calculate_course_gaps(course, assessment):
    course_name = course["name"]

    knowledge = assessment.skill_levels or {}
    confidence = assessment.confidence_levels or {}

    knowledge_level = knowledge.get(course_name)
    confidence_level = confidence.get(course_name)

    if knowledge_level == -1 or confidence_level == -1:
        return None

    if knowledge_level is None or confidence_level is None:
        return None

    knowledge_gap = max(0, TARGET_LEVEL - float(knowledge_level))
    confidence_gap = max(0, TARGET_LEVEL - float(confidence_level))

    combined_gap = round(
        (knowledge_gap + confidence_gap) / 2,
        2
    )

    return {
        "skill": course_name,
        "current_level": float(knowledge_level),
        "confidence_level": float(confidence_level),
        "target_level": TARGET_LEVEL,
        "knowledge_gap": round(knowledge_gap, 2),
        "confidence_gap": round(confidence_gap, 2),
        "gap": combined_gap
    }


def generate_learning_plan(student, assessment, db):
    semester, courses = get_student_curriculum(student)
    completed = get_completed_course_keys(db, student)

    recommendations = []
    study_candidates = []

    for course in courses:
        course_key = course["course_key"]
        course_name = course["name"]

        normalized_key = course_key.strip().casefold()
        normalized_name = course_name.strip().casefold()

        if normalized_key in completed or normalized_name in completed:
            continue

        if is_marked_pass_no_pass(course, assessment):
            continue

        if is_completion_course(course):
            recommendations.append({
                "course_id": course_key,
                "course_code": course.get("code"),
                "course_name": course_name,
                "semester": semester,
                "credits": course.get("credits"),
                "recommendation_type": "completion_requirement",
                "assessment_type": "pass_no_pass",
                "action": "complete_activity",
                "priority_score": 0,
                "reason": (
                    "Complete the required participation or activities "
                    "for this course. No exam preparation is required."
                ),
                "skill_gaps": [],
                "estimated_hours": 0
            })
            continue

        gaps = calculate_course_gaps(course, assessment)

        if gaps is None or gaps["gap"] <= 0:
            continue

        study_candidates.append({
            "course": course,
            "gaps": [gaps],
            "priority_score": gaps["gap"]
        })

    study_candidates.sort(
        key=lambda item: item["priority_score"],
        reverse=True
    )

    weekly_plan = []
    remaining_hours = int(assessment.available_hours or 0)

    for item in study_candidates:
        if remaining_hours <= 0:
            break

        course = item["course"]

        allocated_hours = min(MAX_HOURS_PER_COURSE, remaining_hours)
        daily_hours = round(allocated_hours / len(WEEKDAYS), 2)

        weekly_plan.append({
            "course_id": course["course_key"],
            "course_name": course["name"],
            "total_hours": allocated_hours,
            "daily_schedule": [
                {"day": day, "hours": daily_hours}
                for day in WEEKDAYS
            ]
        })

        recommendations.append({
            "course_id": course["course_key"],
            "course_code": course.get("code"),
            "course_name": course["name"],
            "semester": semester,
            "credits": course.get("credits"),
            "recommendation_type": "skill_development",
            "assessment_type": "graded",
            "action": "study",
            "priority_score": item["priority_score"],
            "reason": (
                "This course is prioritized using your knowledge "
                "and confidence ratings."
            ),
            "skill_gaps": item["gaps"],
            "estimated_hours": allocated_hours
        })

        remaining_hours -= allocated_hours

    recommendations.sort(
        key=lambda item: item["priority_score"],
        reverse=True
    )

    return {
        "branch": student.branch,
        "semester": semester,
        "recommendations": recommendations,
        "available_hours": assessment.available_hours,
        "weekly_plan": weekly_plan
    }


@router.post("/students/{student_id}/generate-plan")
def create_learning_plan(
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

    plan = generate_learning_plan(student, assessment, db)

    return {
        "message": "Personalized learning plan generated successfully",
        "student_id": student_id,
        "student_name": student.name,
        "plan": plan
    }
