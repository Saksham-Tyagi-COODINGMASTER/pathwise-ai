ACTION_TEXT = {
    "take_quiz": "take the {course} quiz so we can measure how strong your {skill} really is",
    "study_resources": "review the {course} study resources to rebuild your {skill} fundamentals",
    "practise_quiz": "retake the {course} quiz to push your {skill} further",
}


def _format_hours(hours):
    return f"{hours:g}"


def build_explanation(
    student_name,
    next_step,
    skill_gaps,
    plan_summary,
    recent_quiz_history,
):
    """
    Build a short, deterministic explanation of the dashboard data.

    This only DESCRIBES decisions the backend already made. It never decides
    eligibility, prerequisites or course choice.
    """
    parts = []

    # 1. Next step
    if next_step:
        template = ACTION_TEXT.get(
            next_step["action"],
            "work on your {skill} skills in {course}",
        )
        action_text = template.format(
            course=next_step["course_name"],
            skill=next_step["skill"],
        )
        parts.append(f"Your best next step is to {action_text}.")
    else:
        parts.append(
            "You have no weak skills right now - great work. "
            "Keep practising to stay sharp."
        )

    # 2. Biggest gap (skill_gaps is already sorted, largest gap first)
    if skill_gaps:
        top_gap = skill_gaps[0]
        parts.append(
            f"Your biggest gap right now is {top_gap['skill']} "
            f"(level {top_gap['current_level']:g} out of a target of "
            f"{top_gap['target_level']:g})."
        )

    # 3. Plan focus (plan_summary courses are already priority-ordered)
    if plan_summary and plan_summary.get("courses"):
        top_course = plan_summary["courses"][0]
        parts.append(
            f"This week's plan puts the most time into "
            f"{top_course['course_name']}: "
            f"{_format_hours(top_course['estimated_hours'])} hours."
        )

    # 4. Motivation, based on the latest quiz (history is newest first)
    if recent_quiz_history:
        latest = recent_quiz_history[0]
        score = latest["score"]
        label = f"{latest['course_id']}, {score:g}%"
        if score >= 80:
            parts.append(
                f"Your latest quiz ({label}) shows real progress - "
                "keep that momentum going."
            )
        elif score >= 50:
            parts.append(
                f"Your latest quiz ({label}) is a solid base - "
                "a little more practice will move it up."
            )
        else:
            parts.append(
                f"Your latest quiz ({label}) is a starting point, not a "
                "verdict - each attempt gives us better evidence to "
                "personalise your plan."
            )
    else:
        parts.append(
            f"Take your first quiz, {student_name}, and your plan will "
            "start adapting to what you actually know."
        )

    return {
        "text": " ".join(parts),
        "source": "template",
    }