import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
curricula = json.loads((DATA / "iit_dharwad_curricula.json").read_text(encoding="utf-8"))
bank = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))

courses = {}
codeless = []


def walk(node):
    if isinstance(node, dict):
        if "course_key" in node and "code" in node:
            if node["code"]:
                courses.setdefault(node["code"], node)
            else:
                codeless.append(node.get("name", node["course_key"]))
        for v in node.values():
            walk(v)
    elif isinstance(node, list):
        for v in node:
            walk(v)


walk(curricula["curricula"])

codes = sorted(courses)
bank_keys = set(bank)
matched = [c for c in codes if c in bank_keys]

print(f"Unique curriculum course codes: {len(codes)}")
print(f"Codes that have questions in questions.json: {len(matched)}")
print(f"Keys in questions.json that match NO curriculum code: {sorted(bank_keys - set(codes))}")
print("\nFirst 15 codes:", codes[:15])
print("Statuses:", sorted({str(c.get('status', '?')) for c in courses.values()}))
print(f"Courses with no code (electives etc.): {len(codeless)}")