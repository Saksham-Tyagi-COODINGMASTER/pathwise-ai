
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Student, StudentCourseProgress
from assessment_model import Assessment
from curriculum import CURRICULA, get_effective_semester
from quiz import get_questions


router = APIRouter()

TARGET_LEVEL = 3


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

    if requested_branch in curricula:
        return requested_branch, curricula[requested_branch]

    alias_key = normalize_branch_name(requested_branch)
    canonical_branch = BRANCH_ALIASES.get(alias_key)

    if canonical_branch and canonical_branch in curricula:
        return canonical_branch, curricula[canonical_branch]

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


def get_current_courses(student):
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


def get_completed_courses(db, student):
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


def build_recommendation(course, assessment):
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

    total_gap = round(
        (knowledge_gap + confidence_gap) / 2,
        2
    )

    if total_gap <= 0:
        return None

    try:
        questions = get_questions(course["course_key"])
        has_quiz = bool(questions)
    except Exception:
        has_quiz = False

    if has_quiz:
        action = "take_quiz"
        why = (
            "Your assessment shows a learning gap. "
            "Take the course quiz to measure your understanding."
        )
    else:
        action = "study_resources"
        why = (
            "Your assessment shows a learning gap. "
            "Review the course fundamentals and learning materials."
        )

    return {
        "course_id": course["course_key"],
        "course_code": course.get("code"),
        "course_name": course_name,
        "recommendation_type": "skill_development",
        "assessment_type": "graded",
        "priority_score": total_gap,
        "weak_skills": [
            {
                "skill": course_name,
                "current_level": float(knowledge_level),
                "confidence_level": float(confidence_level),
                "target_level": TARGET_LEVEL,
                "knowledge_gap": round(knowledge_gap, 2),
                "confidence_gap": round(confidence_gap, 2),
                "gap": total_gap,
                "action": action,
                "why": why
            }
        ],
        "resources": []
    }


@router.get("/students/{student_id}/recommendations")
def get_recommendations(
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

    semester, courses = get_current_courses(student)
    completed = get_completed_courses(db, student)

    recommendations = []

    for course in courses:
        course_id = course["course_key"]
        course_name = course["name"]

        normalized_id = course_id.strip().casefold()
        normalized_name = course_name.strip().casefold()

        if normalized_id in completed or normalized_name in completed:
            continue

        if is_marked_pass_no_pass(course, assessment):
            continue

        if is_completion_course(course):
            recommendations.append({
                "course_id": course_id,
                "course_code": course.get("code"),
                "course_name": course_name,
                "recommendation_type": "completion_requirement",
                "assessment_type": "pass_no_pass",
                "priority_score": 0,
                "action": "complete_activity",
                "reason": (
                    "Complete the required participation or activities "
                    "for this course. No exam preparation is required."
                ),
                "weak_skills": [],
                "resources": []
            })
            continue

        recommendation = build_recommendation(course, assessment)

        if recommendation:
            recommendations.append(recommendation)

    recommendations.sort(
        key=lambda item: item["priority_score"],
        reverse=True
    )

    next_step = None

    if recommendations:
        top = recommendations[0]

        if top["recommendation_type"] == "completion_requirement":
            next_step = {
                "course_id": top["course_id"],
                "course_name": top["course_name"],
                "action": "complete_activity",
                "why": top["reason"]
            }
        else:
            focus = top["weak_skills"][0]

            next_step = {
                "course_id": top["course_id"],
                "course_name": top["course_name"],
                "skill": focus["skill"],
                "action": focus["action"],
                "why": focus["why"]
            }

    return {
        "student_id": student_id,
        "branch": student.branch,
        "semester": semester,
        "next_step": next_step,
        "recommended_courses": recommendations,
        "review_completed": [],
        "blocked_courses": []
    }
