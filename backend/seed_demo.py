"""
Create a predictable Pathwise AI demo student without deleting existing data.

Run from the backend folder:
    .\\venv\\Scripts\\python.exe seed_demo.py

Safe to run more than once:
- Reuses the demo student if it already exists.
- Adds an assessment only if the student has none.
- Adds sample quiz attempts only if the student has no quiz history.
- Does not delete or modify other students.
"""

from database import Base, SessionLocal, engine

# Import every model before create_all so SQLAlchemy knows all table definitions.
from models import Student
from assessment_model import Assessment
from quiz_model import QuizAttempt


DEMO_NAME = "Pathwise Demo Student"
DEMO_PROGRAMME = "B.Tech"
DEMO_YEAR = 1
DEMO_GOAL = "Build strong foundations in programming, mathematics, and problem solving"

DEMO_SKILL_LEVELS = {
    "Python": 2,
    "Programming Logic": 2,
    "Data Structures": 1,
    "Algorithms": 1,
    "Problem Solving": 2,
    "Calculus": 2,
    "Mathematical Reasoning": 1,
}

# Each answer is keyed by question ID. Only these questions are recorded as attempted.
# The option keys correspond to the current data/questions.json file.
DEMO_QUIZ_ATTEMPTS = [
    {
        "course_id": "CS101",
        "questions": ["CS101_Q1", "CS101_Q2", "CS101_Q3", "CS101_Q4"],
        "answers": {
            "CS101_Q1": "B",  # correct
            "CS101_Q2": "A",  # incorrect
            "CS101_Q3": "C",  # correct
            "CS101_Q4": "B",  # incorrect
        },
        "score": 50.0,
        "total_questions": 4,
    },
    {
        "course_id": "CS102",
        "questions": [
            "CS102_Q1",
            "CS102_Q2",
            "CS102_Q3",
            "CS102_Q4",
            "CS102_Q5",
        ],
        "answers": {
            "CS102_Q1": "B",  # correct
            "CS102_Q2": "A",  # incorrect
            "CS102_Q3": "B",  # correct
            "CS102_Q4": "C",  # correct
            "CS102_Q5": "A",  # incorrect
        },
        "score": 60.0,
        "total_questions": 5,
    },
]


def main():
    # Creates missing tables only; it does not erase existing tables or rows.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        student = (
            db.query(Student)
            .filter(
                Student.name == DEMO_NAME,
                Student.programme == DEMO_PROGRAMME,
            )
            .first()
        )

        if student is None:
            student = Student(
                name=DEMO_NAME,
                programme=DEMO_PROGRAMME,
                year=DEMO_YEAR,
                goal=DEMO_GOAL,
                hours_per_week=15,
                skills=[],
                completed_courses=["CS101"],
                learning_preferences=["hands-on practice", "structured learning"],
            )
            db.add(student)
            db.flush()
            print(f"Created demo student (ID: {student.id}).")
        else:
            print(f"Reusing demo student (ID: {student.id}); existing profile left unchanged.")

        assessment = (
            db.query(Assessment)
            .filter(Assessment.student_id == student.id)
            .order_by(Assessment.created_at.desc(), Assessment.id.desc())
            .first()
        )

        if assessment is None:
            db.add(
                Assessment(
                    student_id=student.id,
                    skill_levels=DEMO_SKILL_LEVELS,
                    interests=["programming", "mathematics", "problem solving"],
                    confidence_levels={
                        "Python": 2,
                        "Programming Logic": 2,
                        "Data Structures": 1,
                        "Algorithms": 1,
                        "Problem Solving": 2,
                        "Calculus": 2,
                        "Mathematical Reasoning": 1,
                    },
                    available_hours=15,
                )
            )
            print("Added demo skill assessment.")
        else:
            print("Assessment already exists; leaving it unchanged.")

        existing_attempt = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.student_id == student.id)
            .first()
        )

        if existing_attempt is None:
            for attempt_data in DEMO_QUIZ_ATTEMPTS:
                db.add(
                    QuizAttempt(
                        student_id=student.id,
                        course_id=attempt_data["course_id"],
                        questions=attempt_data["questions"],
                        answers=attempt_data["answers"],
                        score=attempt_data["score"],
                        total_questions=attempt_data["total_questions"],
                    )
                )
            print(f"Added {len(DEMO_QUIZ_ATTEMPTS)} sample quiz attempts.")
        else:
            print("Quiz history already exists; leaving it unchanged.")

        db.commit()

        print("\nDEMO DATA READY")
        print("==============================")
        print(f"Student ID: {student.id}")
        print(f"Student name: {student.name}")
        print("Completed courses: CS101")
        print("Available study hours: 15 per week")
        print("Open this endpoint to verify:")
        print(f"http://127.0.0.1:8000/students/{student.id}/dashboard")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
