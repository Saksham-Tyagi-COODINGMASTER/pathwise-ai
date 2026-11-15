
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "pathwise.db"

if not DB_PATH.exists():
    print("Database not found:", DB_PATH)
    raise SystemExit(1)

connection = sqlite3.connect(DB_PATH)

try:
    cursor = connection.cursor()

    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='students'
    """)

    if not cursor.fetchone():
        print("Students table does not exist.")
        raise SystemExit(1)

    cursor.execute("PRAGMA table_info(students)")
    columns = [column[1] for column in cursor.fetchall()]

    if "user_id" not in columns:
        cursor.execute("""
            ALTER TABLE students
            ADD COLUMN user_id INTEGER
        """)
        print("Added students.user_id")
    else:
        print("students.user_id already exists")

    if "goals" not in columns:
        cursor.execute("""
            ALTER TABLE students
            ADD COLUMN goals JSON NOT NULL DEFAULT '[]'
        """)
        print("Added students.goals")
    else:
        print("students.goals already exists")

    connection.commit()

    print("\nUpdated students table:")
    cursor.execute("PRAGMA table_info(students)")

    for column in cursor.fetchall():
        print("-", column[1])

    print("\nMigration completed successfully!")

finally:
    connection.close()
