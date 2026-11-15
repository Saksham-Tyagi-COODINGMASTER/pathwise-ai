from fastapi import APIRouter
import json
from pathlib import Path


COURSE_FILE = Path(__file__).parent / "data" / "courses.json"
router = APIRouter()


def load_courses():
    with open(COURSE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def check_prerequisites(course_id, completed_courses):
    courses = load_courses()

    # Keep the requested ID separate from loop variables.
    requested_course_id = course_id

    target_course = next(
        (
            course for course in courses
            if course["course_id"] == requested_course_id
        ),
        None
    )

    if target_course is None:
        return {
            "course_id": requested_course_id,
            "valid": False,
            "message": "Course not found",
            "missing_prerequisites": []
        }

    # Normalize completed IDs and names for case-insensitive matching.
    completed_normalized = {
        str(item).strip().casefold()
        for item in (completed_courses or [])
    }

    completed_ids = set()

    for course in courses:
        course_id_in_catalog = course["course_id"]
        course_name = course["course_name"]

        if (
            course_id_in_catalog.strip().casefold() in completed_normalized
            or course_name.strip().casefold() in completed_normalized
        ):
            completed_ids.add(course_id_in_catalog)

    prerequisites = target_course.get("prerequisites", [])

    missing = [
        prerequisite
        for prerequisite in prerequisites
        if prerequisite not in completed_ids
    ]

    return {
        "course_id": requested_course_id,
        "course_name": target_course["course_name"],
        "valid": len(missing) == 0,
        "missing_prerequisites": missing,
        "message": (
            "Student is eligible for this course"
            if not missing
            else "Student must complete prerequisite courses first"
        )
    }


@router.get("/courses/{course_id}/prerequisites")
def get_prerequisites(
    course_id: str,
    completed_courses: str = ""
):
    completed = [
        course.strip()
        for course in completed_courses.split(",")
        if course.strip()
    ]

    return check_prerequisites(course_id, completed)
