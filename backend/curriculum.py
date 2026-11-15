
"""IIT Dharwad curriculum and student course-progress endpoints."""

from pathlib import Path
from datetime import date
import json
from copy import deepcopy

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user
from models import User, Student, StudentCourseProgress


router = APIRouter(prefix="/curriculum", tags=["Curriculum"])

DATA_PATH = (
    Path(__file__).resolve().parent
    / "data"
    / "iit_dharwad_curricula.json"
)

with DATA_PATH.open("r", encoding="utf-8") as file:
    CURRICULA = json.load(file)


class ProgressUpdate(BaseModel):
    completed: bool


# ---------------------------------------------------------
# BRANCH RESOLUTION
# ---------------------------------------------------------

BRANCH_ALIASES = {
    "cse": "CSE",
    "computer science and engineering": "CSE",
    "computer science & engineering": "CSE",

    "ece": "ECE",
    "electronics and communication engineering": "ECE",
    "electronics & communication engineering": "ECE",

    "eee": "EEE",
    "electrical and electronics engineering": "EEE",
    "electrical & electronics engineering": "EEE",

    "ee": "EE",
    "electrical engineering": "EE",

    "engineering physics": "Engineering Physics",

    "mathematics and computing": "Mathematics and Computing",
    "mathematics & computing": "Mathematics and Computing",

    "mechanical engineering": "Mechanical Engineering",
    "me": "Mechanical Engineering",

    "chemical and biochemical engineering":
        "Chemical and Biochemical Engineering",
    "chemical & biochemical engineering":
        "Chemical and Biochemical Engineering",

    "civil and infrastructure engineering":
        "Civil and Infrastructure Engineering",
    "civil & infrastructure engineering":
        "Civil and Infrastructure Engineering",
}


def normalize_branch_name(branch):
    return " ".join(
        str(branch or "").strip().casefold().split()
    )


def resolve_branch_key(branch):
    """Resolve either a branch code or its display name."""

    if not branch:
        return None

    curricula = CURRICULA.get("curricula", {})
    requested = str(branch).strip()

    # Exact curriculum key.
    if requested in curricula:
        return requested

    normalized = normalize_branch_name(requested)

    # Known branch aliases.
    canonical_branch = BRANCH_ALIASES.get(normalized)

    if canonical_branch and canonical_branch in curricula:
        return canonical_branch

    # Match curriculum keys and official display names.
    for key, branch_data in curricula.items():
        if normalize_branch_name(key) == normalized:
            return key

        if normalize_branch_name(
            branch_data.get("branch")
        ) == normalized:
            return key

    return None


# ---------------------------------------------------------
# SEMESTER RESOLUTION
# ---------------------------------------------------------

def get_effective_semester(student: Student) -> int:
    """
    Use the semester explicitly selected in the student profile.

    Admission year is only a fallback for older profiles
    where current_semester is missing or invalid.
    """

    if student.current_semester is not None:
        try:
            selected_semester = int(student.current_semester)

            if 1 <= selected_semester <= 8:
                return selected_semester

        except (TypeError, ValueError):
            pass

    if student.admission_year is None:
        return 1

    try:
        admission_year = int(student.admission_year)
    except (TypeError, ValueError):
        return 1

    today = date.today()
    year_difference = today.year - admission_year

    if today.month >= 8:
        semester = (year_difference * 2) + 1
    else:
        semester = (year_difference * 2) + 2

    return max(1, min(8, semester))


# ---------------------------------------------------------
# STUDENT AND CURRICULUM
# ---------------------------------------------------------

def get_student_and_branch(user: User, db: Session):
    """Retrieve the student and resolve their assigned curriculum."""

    student = (
        db.query(Student)
        .filter(Student.user_id == user.id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Complete onboarding first"
        )

    if not student.institute or not student.branch:
        raise HTTPException(
            status_code=404,
            detail="No curriculum has been assigned to this profile"
        )

    branch_key = resolve_branch_key(student.branch)

    branch_data = CURRICULA.get(
        "curricula", {}
    ).get(branch_key)

    if not branch_data:
        available = ", ".join(
            CURRICULA.get("curricula", {}).keys()
        )

        raise HTTPException(
            status_code=404,
            detail=(
                f"Curriculum not found for branch "
                f"'{student.branch}'. "
                f"Available curriculum keys: {available}"
            )
        )

    return student, branch_data


# ---------------------------------------------------------
# CURRICULUM OPTIONS
# ---------------------------------------------------------

@router.get("/options")
def curriculum_options():
    """Return available curriculum onboarding options."""

    return CURRICULA["institutes"]


# ---------------------------------------------------------
# GET STUDENT CURRICULUM
# ---------------------------------------------------------

@router.get("/me")
def get_my_curriculum(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the student's curriculum and course progress."""

    student, branch_data = get_student_and_branch(user, db)

    effective_semester = get_effective_semester(student)

    courses = deepcopy(branch_data["courses"])

    progress_rows = (
        db.query(StudentCourseProgress)
        .filter(
            StudentCourseProgress.student_id == student.id
        )
        .all()
    )

    manually_completed_ids = {
        row.course_key
        for row in progress_rows
        if row.completed
    }

    verified_course_ids = {
        course["course_key"]
        for course in courses
        if course.get("status") == "verified"
    }

    auto_completed_ids = {
        course["course_key"]
        for course in courses
        if (
            course.get("status") == "verified"
            and course["semester"] < effective_semester
        )
    }

    completed_ids = (
        manually_completed_ids & verified_course_ids
    ) | auto_completed_ids

    semesters = []

    for semester_number in range(1, 9):

        semester_courses = [
            course
            for course in courses
            if course["semester"] == semester_number
        ]

        for course in semester_courses:

            is_verified = course.get("status") == "verified"
            course_key = course["course_key"]

            course["completed"] = (
                is_verified and course_key in completed_ids
            )

            course["auto_completed"] = (
                course_key in auto_completed_ids
            )

        completed_courses = sum(
            1
            for course in semester_courses
            if course["completed"]
        )

        semesters.append({
            "semester": semester_number,
            "courses": semester_courses,
            "total_courses": len(semester_courses),
            "completed_courses": completed_courses,
            "is_completed": semester_number < effective_semester,
            "is_current": semester_number == effective_semester,
            "is_upcoming": semester_number > effective_semester
        })

    all_courses = [
        course
        for course in courses
        if course.get("status") == "verified"
    ]

    completed_count = sum(
        1
        for course in all_courses
        if course["course_key"] in completed_ids
    )

    total_credits = sum(
        course["credits"]
        for course in all_courses
        if isinstance(course.get("credits"), (int, float))
        and not isinstance(course.get("credits"), bool)
    )

    completed_credits = sum(
        course["credits"]
        for course in all_courses
        if (
            course["course_key"] in completed_ids
            and isinstance(course.get("credits"), (int, float))
            and not isinstance(course.get("credits"), bool)
        )
    )

    completion_percent = (
        round(completed_count / len(all_courses) * 100)
        if all_courses
        else 0
    )

    return {
        "institute": student.institute,
        "degree": student.degree,
        "branch": student.branch,
        "admission_year": student.admission_year,
        "curriculum_version": student.curriculum_version,
        "current_semester": effective_semester,
        "source_status": branch_data.get("source_status"),
        "semesters": semesters,
        "total_courses": len(all_courses),
        "completed_courses": completed_count,
        "total_credits": total_credits,
        "completed_credits": completed_credits,
        "completion_percent": completion_percent
    }


# ---------------------------------------------------------
# UPDATE COURSE PROGRESS
# ---------------------------------------------------------

@router.put("/progress/{course_key}")
def update_course_progress(
    course_key: str,
    payload: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update progress for a verified course."""

    student, branch_data = get_student_and_branch(user, db)

    course = next(
        (
            course
            for course in branch_data.get("courses", [])
            if course["course_key"] == course_key
        ),
        None
    )

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found in your assigned curriculum"
        )

    if course.get("status") != "verified":
        raise HTTPException(
            status_code=409,
            detail="This course is awaiting curriculum verification"
        )

    effective_semester = get_effective_semester(student)

    if course["semester"] < effective_semester:
        raise HTTPException(
            status_code=409,
            detail="Previous semester courses are automatically completed"
        )

    row = (
        db.query(StudentCourseProgress)
        .filter_by(
            student_id=student.id,
            course_key=course_key
        )
        .first()
    )

    if row is None:
        row = StudentCourseProgress(
            student_id=student.id,
            course_key=course_key,
            completed=payload.completed
        )
        db.add(row)
    else:
        row.completed = payload.completed

    db.commit()

    return {
        "course_key": course_key,
        "completed": row.completed
    }
