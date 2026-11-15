"""Validate the IIT Dharwad curriculum JSON without modifying it."""
from collections import defaultdict
from pathlib import Path
import json

path = Path(__file__).resolve().parent / "data" / "iit_dharwad_curricula.json"
data = json.loads(path.read_text(encoding="utf-8"))
errors = []
for branch, curriculum in data["curricula"].items():
    seen = set()
    for course in curriculum.get("courses", []):
        required = {"course_key", "name", "semester", "credits", "status"}
        missing = required - course.keys()
        if missing:
            errors.append(f"{branch}: {course.get('course_key')} missing {sorted(missing)}")
        key = course.get("course_key")
        if key in seen:
            errors.append(f"{branch}: duplicate course_key {key}")
        seen.add(key)
        if course.get("semester") not in range(1, 9):
            errors.append(f"{branch}: invalid semester for {key}")
        if course.get("credits") is not None and not isinstance(course["credits"], (int, float)):
            errors.append(f"{branch}: nonnumeric credits for {key}")
        if course.get("status") != "verified" and course.get("credits") is not None and course.get("status") == "pending_verification":
            # Credits may be retained for audit, but must not be used as verified credit totals.
            pass

if errors:
    print("CURRICULUM VALIDATION FAILED")
    print("\n".join(errors))
    raise SystemExit(1)
print(f"Validated {len(data['curricula'])} curriculum versions and "
      f"{sum(len(x.get('courses', [])) for x in data['curricula'].values())} course/slot rows.")
print(f"Credit discrepancies requiring confirmation: {len(data.get('credit_discrepancies', []))}")
