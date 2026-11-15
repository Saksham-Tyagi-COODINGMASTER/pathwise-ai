
from collections import defaultdict


TARGET_LEVEL = 3.0
MIN_SKILL_HOURS = 0.5


def _normalise_list(value):
    """Convert JSON list/dict/string values into a clean list of strings."""
    if not value:
        return []

    if isinstance(value, str):
        return [value.strip()] if value.strip() else []

    if isinstance(value, dict):
        return [
            str(key).strip()
            for key, enabled in value.items()
            if enabled and str(key).strip()
        ]

    if isinstance(value, list):
        result = []

        for item in value:
            if isinstance(item, str):
                if item.strip():
                    result.append(item.strip())
            elif isinstance(item, dict):
                name = (
                    item.get("name")
                    or item.get("skill")
                    or item.get("title")
                    or item.get("interest")
                )
                if name:
                    result.append(str(name).strip())

        return result

    return []


def _safe_float(value, default=0.0):
    try:
        number = float(value)
        return number if number >= 0 else default
    except (TypeError, ValueError):
        return default


def _get_available_hours(student, assessment):
    """
    Prefer the latest assessment's available hours.
    Fall back to the student's weekly study hours.
    """
    assessment_hours = getattr(assessment, "available_hours", None)

    if assessment_hours is not None:
        hours = _safe_float(assessment_hours)
        if hours > 0:
            return hours

    student_hours = getattr(student, "hours_per_week", 0)
    return _safe_float(student_hours)


def _get_skill_priorities(assessment, levels):
    """
    Build a priority list using effective skill levels.

    Lower skill levels receive more study time.
    """
    skill_levels = getattr(assessment, "skill_levels", {}) or {}
    confidence_levels = (
        getattr(assessment, "confidence_levels", {}) or {}
    )

    priorities = []

    for skill, details in (levels or {}).items():
        if isinstance(details, dict):
            current_level = _safe_float(
                details.get("effective_level"),
                default=0.0,
            )
        else:
            current_level = _safe_float(details, default=0.0)

        current_level = min(current_level, 5.0)

        if current_level >= TARGET_LEVEL:
            continue

        confidence = confidence_levels.get(skill)

        gap = TARGET_LEVEL - current_level

        # Larger skill gaps receive higher priority.
        priority = gap

        # A low-confidence area deserves some additional practice.
        if confidence is not None:
            confidence_value = str(confidence).lower()

            if confidence_value in ("low", "beginner"):
                priority *= 1.2

        priorities.append({
            "skill": skill,
            "current_level": current_level,
            "target_level": TARGET_LEVEL,
            "gap": round(gap, 2),
            "priority": priority,
        })

    # If mastery data is unavailable, use self-assessment levels.
    if not priorities:
        for skill, value in skill_levels.items():
            current_level = min(
                _safe_float(value),
                5.0,
            )

            if current_level < TARGET_LEVEL:
                gap = TARGET_LEVEL - current_level

                priorities.append({
                    "skill": skill,
                    "current_level": current_level,
                    "target_level": TARGET_LEVEL,
                    "gap": round(gap, 2),
                    "priority": gap,
                })

    return sorted(
        priorities,
        key=lambda item: item["priority"],
        reverse=True,
    )


def _match_interests(skill, interests):
    """Find interest labels related to a skill name."""
    skill_lower = skill.casefold()

    matches = []

    for interest in interests:
        interest_lower = interest.casefold()

        if (
            skill_lower in interest_lower
            or interest_lower in skill_lower
        ):
            matches.append(interest)

    return matches


def generate_learning_plan(student, assessment, levels):
    """
    Generate a deterministic weekly study plan.

    Inputs:
      student: Student database object
      assessment: Latest Assessment database object
      levels: Effective skill levels from mastery.py

    The function does not make eligibility or prerequisite decisions.
    """

    available_hours = _get_available_hours(student, assessment)

    interests = _normalise_list(
        getattr(assessment, "interests", None)
    )

    if not interests:
        interests = _normalise_list(
            getattr(student, "learning_preferences", None)
        )

    goals = _normalise_list(
        getattr(student, "goals", None)
    )

    skill_priorities = _get_skill_priorities(
        assessment,
        levels,
    )

    plan_courses = []

    if available_hours <= 0:
        return {
            "total_hours": 0,
            "courses": [],
            "focus_areas": [],
            "interests": interests,
            "goals": goals,
            "message": "Add your available study hours to create a weekly plan.",
        }

    # Divide available time between weaker skills.
    if skill_priorities:
        total_priority = sum(
            item["priority"]
            for item in skill_priorities
        )

        for item in skill_priorities:
            if total_priority:
                allocated = (
                    available_hours
                    * item["priority"]
                    / total_priority
                )
            else:
                allocated = (
                    available_hours / len(skill_priorities)
                )

            allocated = round(allocated, 2)

            plan_courses.append({
                "course_name": f"{item['skill']} practice",
                "skill": item["skill"],
                "estimated_hours": allocated,
                "current_level": item["current_level"],
                "target_level": item["target_level"],
                "reason": (
                    f"Your current level is {item['current_level']:g}/5. "
                    f"Practising this skill can help close the gap."
                ),
                "matched_interests": _match_interests(
                    item["skill"],
                    interests,
                ),
            })

    # No known skill gaps: make an interest-led exploration plan.
    elif interests:
        allocated = round(
            available_hours / len(interests),
            2,
        )

        for interest in interests:
            plan_courses.append({
                "course_name": f"{interest} exploration",
                "skill": interest,
                "estimated_hours": allocated,
                "current_level": None,
                "target_level": None,
                "reason": (
                    f"Explore this area based on your stated interest "
                    f"in {interest}."
                ),
                "matched_interests": [interest],
            })

    # No assessment skill gaps or interests.
    else:
        plan_courses.append({
            "course_name": "General revision",
            "skill": "Fundamentals",
            "estimated_hours": available_hours,
            "current_level": None,
            "target_level": None,
            "reason": (
                "Use this time to revise your current learning material "
                "and build a stronger foundation."
            ),
            "matched_interests": [],
        })

    focus_areas = [
        item["skill"]
        for item in plan_courses
    ]

    return {
        "total_hours": available_hours,
        "courses": plan_courses,
        "focus_areas": focus_areas,
        "interests": interests,
        "goals": goals,
        "message": (
            "Your weekly plan prioritises skill gaps and uses "
            "your stated interests where possible."
        ),
    }
