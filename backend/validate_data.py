import json
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
COURSE_FILE = DATA_DIR / "courses.json"
QUESTION_FILE = DATA_DIR / "questions.json"
VALID_DIFFICULTIES = {"easy", "medium", "hard"}
VALID_OPTION_KEYS = {"A", "B", "C", "D"}


def load_json(path, label, errors):
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        errors.append(f"{label}: file not found: {path}")
    except json.JSONDecodeError as error:
        errors.append(f"{label}: invalid JSON at line {error.lineno}, column {error.colno}: {error.msg}")
    return None


def is_non_empty_string(value):
    return isinstance(value, str) and bool(value.strip())


def validate_data():
    errors = []
    warnings = []

    courses = load_json(COURSE_FILE, "courses.json", errors)
    question_bank = load_json(QUESTION_FILE, "questions.json", errors)

    if errors:
        return errors, warnings

    if not isinstance(courses, list):
        errors.append("courses.json: the top-level value must be a JSON list.")
        return errors, warnings

    if not isinstance(question_bank, dict):
        errors.append("questions.json: the top-level value must be a JSON object keyed by course ID.")
        return errors, warnings

    course_by_id = {}
    course_names = set()

    # Validate course records and build a course lookup.
    for index, course in enumerate(courses):
        label = f"courses.json course at index {index}"
        if not isinstance(course, dict):
            errors.append(f"{label}: each course must be an object.")
            continue

        course_id = course.get("course_id")
        course_name = course.get("course_name")

        if not is_non_empty_string(course_id):
            errors.append(f"{label}: missing or invalid course_id.")
            continue
        if not is_non_empty_string(course_name):
            errors.append(f"Course {course_id}: missing or invalid course_name.")
            continue

        normalized_id = course_id.strip().casefold()
        if normalized_id in course_by_id:
            errors.append(f"Duplicate course_id: {course_id}.")
        else:
            course_by_id[normalized_id] = course

        normalized_name = course_name.strip().casefold()
        if normalized_name in course_names:
            warnings.append(f"Duplicate course name: {course_name}.")
        course_names.add(normalized_name)

        skills = course.get("skills")
        if not isinstance(skills, list) or not skills:
            errors.append(f"Course {course_id}: skills must be a non-empty list.")
        elif any(not is_non_empty_string(skill) for skill in skills):
            errors.append(f"Course {course_id}: every skill must be a non-empty string.")
        elif len({skill.strip().casefold() for skill in skills}) != len(skills):
            errors.append(f"Course {course_id}: duplicate skills found.")

        prerequisites = course.get("prerequisites", [])
        if not isinstance(prerequisites, list):
            errors.append(f"Course {course_id}: prerequisites must be a list.")
        elif any(not is_non_empty_string(item) for item in prerequisites):
            errors.append(f"Course {course_id}: each prerequisite must be a non-empty course ID.")
        elif len(set(prerequisites)) != len(prerequisites):
            errors.append(f"Course {course_id}: duplicate prerequisites found.")

        resources = course.get("resources", [])
        if not isinstance(resources, list):
            errors.append(f"Course {course_id}: resources must be a list.")
        else:
            for resource_index, resource in enumerate(resources):
                resource_label = f"Course {course_id}, resource {resource_index}"
                if not isinstance(resource, dict):
                    errors.append(f"{resource_label}: resource must be an object with name and url.")
                    continue
                if not is_non_empty_string(resource.get("name")):
                    errors.append(f"{resource_label}: missing or invalid name.")
                url = resource.get("url")
                parsed_url = urlparse(url) if isinstance(url, str) else None
                if not parsed_url or parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
                    errors.append(f"{resource_label}: url must be a valid http or https URL.")

    # Validate prerequisite references after all course IDs are known.
    for normalized_id, course in course_by_id.items():
        course_id = course["course_id"]
        for prerequisite in course.get("prerequisites", []) if isinstance(course.get("prerequisites", []), list) else []:
            if isinstance(prerequisite, str):
                if prerequisite.strip().casefold() not in course_by_id:
                    errors.append(f"Course {course_id}: prerequisite '{prerequisite}' does not exist in courses.json.")
                elif prerequisite.strip().casefold() == normalized_id:
                    errors.append(f"Course {course_id}: a course cannot be its own prerequisite.")

    # Validate quiz questions and ensure their skills match the course catalog.
    question_ids = set()
    for bank_course_id, questions in question_bank.items():
        normalized_bank_id = str(bank_course_id).strip().casefold()
        course = course_by_id.get(normalized_bank_id)
        if course is None:
            errors.append(f"questions.json: course key '{bank_course_id}' does not exist in courses.json.")
            continue
        if not isinstance(questions, list):
            errors.append(f"questions.json: questions for {bank_course_id} must be a list.")
            continue
        if not questions:
            warnings.append(f"Course {bank_course_id} currently has no quiz questions.")

        course_skills = {
            skill.strip().casefold()
            for skill in course.get("skills", [])
            if is_non_empty_string(skill)
        }

        for question_index, question in enumerate(questions):
            label = f"{bank_course_id} question at index {question_index}"
            if not isinstance(question, dict):
                errors.append(f"{label}: each question must be an object.")
                continue

            question_id = question.get("id")
            if not is_non_empty_string(question_id):
                errors.append(f"{label}: missing or invalid id.")
            else:
                normalized_question_id = question_id.strip().casefold()
                if normalized_question_id in question_ids:
                    errors.append(f"Duplicate question ID: {question_id}.")
                question_ids.add(normalized_question_id)
                if not question_id.strip().upper().startswith(str(bank_course_id).strip().upper() + "_Q"):
                    warnings.append(f"Question {question_id}: expected an ID beginning with '{bank_course_id}_Q'.")

            skill = question.get("skill")
            if not is_non_empty_string(skill):
                errors.append(f"{label}: missing or invalid skill.")
            elif skill.strip().casefold() not in course_skills:
                errors.append(f"{label}: skill '{skill}' is not listed for course {bank_course_id}.")

            difficulty = question.get("difficulty")
            if not isinstance(difficulty, str) or difficulty.strip().casefold() not in VALID_DIFFICULTIES:
                errors.append(f"{label}: difficulty must be easy, medium, or hard.")

            if not is_non_empty_string(question.get("question")):
                errors.append(f"{label}: question text is missing.")

            options = question.get("options")
            if not isinstance(options, dict) or set(options.keys()) != VALID_OPTION_KEYS:
                errors.append(f"{label}: options must contain exactly A, B, C, and D.")
            elif any(not is_non_empty_string(value) for value in options.values()):
                errors.append(f"{label}: every option must have non-empty text.")

            correct_answer = question.get("correct_answer")
            if correct_answer not in VALID_OPTION_KEYS:
                errors.append(f"{label}: correct_answer must be one of A, B, C, or D.")
            elif isinstance(options, dict) and correct_answer not in options:
                errors.append(f"{label}: correct_answer does not match an available option.")

            if not is_non_empty_string(question.get("explanation")):
                errors.append(f"{label}: explanation is missing.")

    # Warn when a course has no matching question-bank entry; this is allowed.
    for normalized_id, course in course_by_id.items():
        if normalized_id not in {str(key).strip().casefold() for key in question_bank}:
            warnings.append(f"Course {course['course_id']} has no question-bank entry yet; this is allowed.")

    return errors, warnings


if __name__ == "__main__":
    validation_errors, validation_warnings = validate_data()

    print("\nPATHWISE AI DATA VALIDATION")
    print("=" * 32)

    if validation_warnings:
        print("\nWarnings:")
        for warning in validation_warnings:
            print(f"- {warning}")

    if validation_errors:
        print("\nErrors:")
        for error in validation_errors:
            print(f"- {error}")
        print(f"\nValidation failed: {len(validation_errors)} error(s). Fix these before using the updated data.")
        raise SystemExit(1)

    print("\nNo validation errors found.")
    with COURSE_FILE.open("r", encoding="utf-8") as file:
        courses_for_count = json.load(file)
    with QUESTION_FILE.open("r", encoding="utf-8") as file:
        questions_for_count = json.load(file)
    print(f"Courses checked: {len(courses_for_count)}")
    print(f"Question-bank course entries checked: {len(questions_for_count)}")
    print(f"Questions checked: {sum(len(items) for items in questions_for_count.values() if isinstance(items, list))}")
    print("Validation passed.")
