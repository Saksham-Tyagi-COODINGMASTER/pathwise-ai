"""Add curriculum assignment and per-student course progress tables safely."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "pathwise.db"
if not DB_PATH.exists():
    raise SystemExit(f"Database not found: {DB_PATH}")

columns_to_add = {
    "institute": "TEXT",
    "degree": "TEXT",
    "branch": "TEXT",
    "admission_year": "INTEGER",
    "current_semester": "INTEGER",
    "curriculum_version": "TEXT",
}

with sqlite3.connect(DB_PATH) as connection:
    cursor = connection.cursor()
    existing = {row[1] for row in cursor.execute("PRAGMA table_info(students)")}
    for name, sql_type in columns_to_add.items():
        if name not in existing:
            cursor.execute(f"ALTER TABLE students ADD COLUMN {name} {sql_type}")
            print(f"Added students.{name}")
        else:
            print(f"students.{name} already exists")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_course_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            course_key TEXT NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT 0,
            updated_at DATETIME,
            FOREIGN KEY(student_id) REFERENCES students(id),
            UNIQUE(student_id, course_key)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_course_progress_student_id ON student_course_progress(student_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_student_course_progress_course_key ON student_course_progress(course_key)")
    print("Curriculum migration completed.")
