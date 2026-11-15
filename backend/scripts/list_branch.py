import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
cur = json.loads((DATA / "iit_dharwad_curricula.json").read_text(encoding="utf-8"))["curricula"]
bank = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))

print("curricula type:", type(cur).__name__)
if isinstance(cur, dict):
    print("top-level keys:", list(cur.keys())[:20])
    first = next(iter(cur.values()))
else:
    print("entries:", len(cur))
    first = cur[0]
if isinstance(first, dict):
    print("keys inside first entry:", list(first.keys())[:20])


def collect(node, out):
    if isinstance(node, dict):
        if "course_key" in node and node.get("code"):
            out.append(node)
        for v in node.values():
            collect(v, out)
    elif isinstance(node, list):
        for v in node:
            collect(v, out)


if len(sys.argv) > 1:
    wanted = sys.argv[1].lower()
    items = cur.items() if isinstance(cur, dict) else enumerate(cur)
    for key, entry in items:
        if wanted in str(key).lower() or wanted in json.dumps(entry)[:300].lower():
            found = []
            collect(entry, found)
            seen = {}
            for c in found:
                seen.setdefault(c["code"], c)
            missing = [c for c in seen.values() if c["code"] not in bank]
            verified = [c for c in missing if c.get("status") == "verified"]
            print(f"\nEntry '{key}': {len(seen)} coded courses, "
                  f"{len(verified)} verified without questions")
            for c in verified[:50]:
                print(f"  sem {c.get('semester')}  {c['code']}  {c['name']}")
            break
    else:
        print("No entry matched", sys.argv[1])