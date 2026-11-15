
import uuid
from pathlib import Path
from typing import List, Dict

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from assessment_model import Assessment
from assessment import router as assessment_router
from learning import router as learning_router
from prerequisites import router as prerequisite_router
from planner import router as planner_router
from database import Base, engine, get_db
from models import Student, User, StudentCourseProgress
from curriculum import router as curriculum_router
from quiz_model import QuizAttempt, QuizSession

from quiz import (
    get_questions,
    calculate_score,
    generate_quiz,
    calculate_score_for_questions
)
from mastery import router as mastery_router
from recommendations import router as recommendations_router
from dashboard import router as dashboard_router
from auth import router as auth_router, get_current_user


# Create database tables
Base.metadata.create_all(bind=engine)


# Initialise FastAPI
app = FastAPI(
    title="Pathwise AI API",
    description="Personalised Learning Buddy for Students",
    version="1.0.0"
)


# Profile picture storage
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)


# Register all routers
app.include_router(assessment_router)
app.include_router(learning_router)
app.include_router(prerequisite_router)
app.include_router(planner_router)
app.include_router(mastery_router)
app.include_router(recommendations_router)
app.include_router(dashboard_router)
app.include_router(auth_router)
app.include_router(curriculum_router)


# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://saksham-tyagi-coodingmaster.github.io"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Student registration schema
class StudentCreate(BaseModel):
    name: str = Field(min_length=2)
    programme: str
    year: int = Field(ge=1, le=8)

    goal: str
    hours_per_week: float = Field(gt=0, le=168)

    skills: List[str] = []
    completed_courses: List[str] = []
    learning_preferences: List[str] = []


# Onboarding schema
class OnboardingCreate(BaseModel):
    programme: str = Field(min_length=2)
    year: int = Field(ge=1, le=8)
    goals: List[str] = Field(min_length=1)
    hours_per_week: float = Field(gt=0, le=168)
    institute: str | None = None
    degree: str | None = None
    branch: str | None = None
    admission_year: int | None = Field(default=None, ge=2000, le=2100)
    current_semester: int | None = Field(default=None, ge=1, le=8)
    curriculum_version: str | None = None


# Editable fields for the authenticated student's Settings page.
class ProfileUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    programme: str = Field(min_length=2, max_length=100)
    year: int = Field(ge=1, le=8)
    goals: List[str] = Field(default_factory=list)
    hours_per_week: float = Field(gt=0, le=168)
    institute: str | None = Field(default=None, max_length=150)
    degree: str | None = Field(default=None, max_length=100)
    branch: str | None = Field(default=None, max_length=150)
    admission_year: int | None = Field(default=None, ge=2000, le=2100)
    current_semester: int | None = Field(default=None, ge=1, le=8)
    learning_preferences: List[str] = Field(default_factory=list)


# Quiz submission schema
class QuizSubmission(BaseModel):
    course_id: str
    answers: Dict[str, str]


class QuizGenerationRequest(BaseModel):
    course_id: str
    difficulty: str = "adaptive"
    num_questions: int = Field(default=5, ge=1, le=30)
    course_name: str | None = None
    topics: List[str] = []


class QuizSessionSubmission(BaseModel):
    session_id: int
    answers: Dict[str, str]


# Health check
@app.get("/")
def home():
    return {
        "message": "Pathwise AI backend is running!",
        "status": "healthy"
    }


# Save or update the authenticated user's onboarding profile
@app.post("/onboarding")
def save_onboarding(
    onboarding_data: OnboardingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    if student is None:
        student = Student(
            user_id=current_user.id,
            name=current_user.name,
            programme=onboarding_data.programme,
            year=onboarding_data.year,
            goal=onboarding_data.goals[0],
            goals=onboarding_data.goals,
            hours_per_week=onboarding_data.hours_per_week,
            institute=onboarding_data.institute,
            degree=onboarding_data.degree,
            branch=onboarding_data.branch,
            admission_year=onboarding_data.admission_year,
            current_semester=onboarding_data.current_semester,
            curriculum_version=onboarding_data.curriculum_version
        )

        db.add(student)

    else:
        student.name = current_user.name
        student.programme = onboarding_data.programme
        student.year = onboarding_data.year
        student.goal = onboarding_data.goals[0]
        student.goals = onboarding_data.goals
        student.hours_per_week = onboarding_data.hours_per_week
        student.institute = onboarding_data.institute
        student.degree = onboarding_data.degree
        student.branch = onboarding_data.branch
        student.admission_year = onboarding_data.admission_year
        student.current_semester = onboarding_data.current_semester
        student.curriculum_version = onboarding_data.curriculum_version

    current_user.onboarding_completed = True

    db.commit()
    db.refresh(student)

    return {
        "message": "Onboarding completed successfully!",
        "student": {
            "id": student.id,
            "user_id": student.user_id,
            "name": student.name,
            "programme": student.programme,
            "year": student.year,
            "goal": student.goal,
            "goals": student.goals,
            "hours_per_week": student.hours_per_week,
            "institute": student.institute,
            "degree": student.degree,
            "branch": student.branch,
            "admission_year": student.admission_year,
            "current_semester": student.current_semester,
            "curriculum_version": student.curriculum_version
        },
        "onboarding_completed": current_user.onboarding_completed
    }


# Retrieve the authenticated user's onboarding profile
@app.get("/onboarding/me")
def get_my_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Onboarding profile not found"
        )

    return {
        "id": student.id,
        "user_id": student.user_id,
        "name": student.name,
        "email": current_user.email,
        "picture": current_user.picture,
        "programme": student.programme,
        "year": student.year,
        "goal": student.goal,
        "goals": student.goals or [],
        "hours_per_week": student.hours_per_week,
        "learning_preferences": student.learning_preferences or [],
        "institute": student.institute,
        "degree": student.degree,
        "branch": student.branch,
        "admission_year": student.admission_year,
        "current_semester": student.current_semester,
        "curriculum_version": student.curriculum_version
    }


# Update the authenticated user's profile and learning preferences.
@app.put("/settings/profile")
def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.user_id == current_user.id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Please complete onboarding first."
        )

    clean_name = profile_data.name.strip()
    clean_programme = profile_data.programme.strip()

    if len(clean_name) < 2 or len(clean_programme) < 2:
        raise HTTPException(
            status_code=422,
            detail="Name and programme must contain at least 2 characters."
        )

    clean_goals = [
        item.strip()
        for item in profile_data.goals
        if item.strip()
    ]

    clean_preferences = [
        item.strip()
        for item in profile_data.learning_preferences
        if item.strip()
    ]

    current_user.name = clean_name
    student.name = clean_name
    student.programme = clean_programme
    student.year = profile_data.year
    student.goals = clean_goals

    # Keep the legacy single-goal field in sync for existing features.
    student.goal = clean_goals[0] if clean_goals else ""

    student.hours_per_week = profile_data.hours_per_week

    student.institute = (
        profile_data.institute.strip()
        if profile_data.institute else None
    )

    student.degree = (
        profile_data.degree.strip()
        if profile_data.degree else None
    )

    student.branch = (
        profile_data.branch.strip()
        if profile_data.branch else None
    )

    student.admission_year = profile_data.admission_year
    student.current_semester = profile_data.current_semester
    student.learning_preferences = clean_preferences

    try:
        db.commit()
        db.refresh(student)
        db.refresh(current_user)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to save profile changes. Please try again."
        )

    return {
        "message": "Profile updated successfully!",
        "student": {
            "id": student.id,
            "user_id": student.user_id,
            "name": student.name,
            "email": current_user.email,
            "picture": current_user.picture,
            "programme": student.programme,
            "year": student.year,
            "goal": student.goal,
            "goals": student.goals or [],
            "hours_per_week": student.hours_per_week,
            "learning_preferences": student.learning_preferences or [],
            "institute": student.institute,
            "degree": student.degree,
            "branch": student.branch,
            "admission_year": student.admission_year,
            "current_semester": student.current_semester,
            "curriculum_version": student.curriculum_version
        }
    }


# Upload or replace the authenticated user's profile picture
@app.post("/settings/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed_types = {
        "image/jpeg": (".jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
        "image/png": (".png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
        "image/webp": (
            ".webp",
            lambda data: (
                len(data) >= 12
                and data[:4] == b"RIFF"
                and data[8:12] == b"WEBP"
            )
        )
    }

    file_info = allowed_types.get(file.content_type)

    if not file_info:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WebP images are supported."
        )

    extension, signature_check = file_info
    image_data = await file.read(5 * 1024 * 1024 + 1)

    if not image_data:
        raise HTTPException(
            status_code=400,
            detail="The selected image is empty."
        )

    if len(image_data) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image size must be 5 MB or less."
        )

    if not signature_check(image_data):
        raise HTTPException(
            status_code=400,
            detail="The selected file is not a valid image of the chosen type."
        )

    filename = f"{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename

    old_picture = current_user.picture

    try:
        destination.write_bytes(image_data)

        current_user.picture = f"/uploads/{filename}"

        db.commit()
        db.refresh(current_user)

    except Exception:
        db.rollback()

        if destination.exists():
            destination.unlink()

        raise HTTPException(
            status_code=500,
            detail="Unable to save your profile picture."
        )

    # Delete the previous uploaded file only after the new one is saved.
    if old_picture and old_picture.startswith("/uploads/"):
        old_file = UPLOAD_DIR / Path(old_picture).name

        if old_file.exists() and old_file.is_file():
            old_file.unlink()

    return {
        "message": "Profile picture updated successfully.",
        "picture": current_user.picture
    }


# Remove the authenticated user's profile picture
@app.delete("/settings/profile-picture")
def remove_profile_picture(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    old_picture = current_user.picture

    try:
        current_user.picture = None

        db.commit()
        db.refresh(current_user)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to remove your profile picture."
        )

    # Delete only a file stored in this application's uploads directory.
    if old_picture and old_picture.startswith("/uploads/"):
        old_file = UPLOAD_DIR / Path(old_picture).name

        if old_file.exists() and old_file.is_file():
            old_file.unlink()

    return {
        "message": "Profile picture removed successfully.",
        "picture": None
    }


# Register a student (existing endpoint)
@app.post("/students")
def create_student(
    student_data: StudentCreate,
    db: Session = Depends(get_db)
):
    student = Student(
        name=student_data.name,
        programme=student_data.programme,
        year=student_data.year,
        goal=student_data.goal,
        hours_per_week=student_data.hours_per_week,
        skills=student_data.skills,
        completed_courses=student_data.completed_courses,
        learning_preferences=student_data.learning_preferences
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return {
        "message": "Student registered successfully!",
        "student": {
            "id": student.id,
            "name": student.name,
            "programme": student.programme,
            "year": student.year,
            "goal": student.goal,
            "hours_per_week": student.hours_per_week,
            "skills": student.skills,
            "completed_courses": student.completed_courses,
            "learning_preferences": student.learning_preferences
        }
    }


# Retrieve a student's profile
@app.get("/students/{student_id}")
def get_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    return {
        "id": student.id,
        "name": student.name,
        "programme": student.programme,
        "year": student.year,
        "goal": student.goal,
        "goals": student.goals or [],
        "hours_per_week": student.hours_per_week,
        "skills": student.skills,
        "completed_courses": student.completed_courses,
        "learning_preferences": student.learning_preferences
    }


# Retrieve all registered students
@app.get("/students")
def get_all_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    return students


# Update a student's completed courses
@app.patch("/students/{student_id}/completed-courses")
def update_completed_courses(
    student_id: int,
    completed_courses: List[str],
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    student.completed_courses = completed_courses
    db.commit()
    db.refresh(student)

    return {
        "message": "Completed courses updated successfully",
        "student_id": student.id,
        "completed_courses": student.completed_courses
    }


# Retrieve quiz questions for a course
@app.get("/courses/{course_id}/quiz")
def get_course_quiz(course_id: str):
    questions = get_questions(course_id)

    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"No quiz questions found for course '{course_id.upper()}'"
        )

    safe_questions = []

    for question in questions:
        safe_questions.append({
            "id": question["id"],
            "skill": question["skill"],
            "difficulty": question["difficulty"],
            "question": question["question"],
            "options": question["options"]
        })

    return {
        "course_id": course_id.upper(),
        "total_questions": len(safe_questions),
        "questions": safe_questions
    }


@app.post("/students/{student_id}/quiz/generate")
def create_generated_quiz(
    student_id: int,
    request: QuizGenerationRequest,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    try:
        result = generate_quiz(
            course_id=request.course_id,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            course_name=request.course_name,
            topics=request.topics
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    if not result["success"]:
        raise HTTPException(
            status_code=503,
            detail=result.get("error", "Quiz generation failed")
        )

    session = QuizSession(
        student_id=student_id,
        course_id=request.course_id.upper(),
        questions=result["questions"],
        difficulty=request.difficulty.lower(),
        provider=result["provider"]
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    # Never expose correct answers before submission
    safe_questions = []

    for question in result["questions"]:
        safe_questions.append({
            "id": question["id"],
            "skill": question["skill"],
            "difficulty": question["difficulty"],
            "question": question["question"],
            "options": question["options"]
        })

    return {
        "message": "Quiz generated successfully",
        "session_id": session.id,
        "student_id": student_id,
        "course_id": session.course_id,
        "difficulty": session.difficulty,
        "provider": session.provider,
        "requested_questions": result["requested_questions"],
        "total_questions": len(safe_questions),
        "questions": safe_questions
    }


@app.post("/students/{student_id}/quiz/session/submit")
def submit_generated_quiz(
    student_id: int,
    submission: QuizSessionSubmission,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    session = db.query(QuizSession).filter(
        QuizSession.id == submission.session_id,
        QuizSession.student_id == student_id
    ).first()

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Quiz session not found"
        )

    if session.is_submitted:
        raise HTTPException(
            status_code=400,
            detail="This quiz has already been submitted"
        )

    questions = session.questions or []

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="This quiz session has no questions"
        )

    question_lookup = {
        question["id"]: question
        for question in questions
    }

    # Validate submitted answers
    for question_id, answer in submission.answers.items():

        if question_id not in question_lookup:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid question ID: {question_id}"
            )

        if answer not in question_lookup[question_id]["options"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid answer for question: {question_id}"
            )

    # Calculate the score using the stored questions
    result = calculate_score_for_questions(
        questions,
        submission.answers
    )

    # Build detailed question-by-question review
    review = []

    for question in questions:
        question_id = question["id"]
        options = question.get("options", {})

        selected_answer = submission.answers.get(question_id)
        correct_answer = question["correct_answer"]

        is_correct = selected_answer == correct_answer

        review.append({
            "id": question_id,
            "skill": question.get("skill", "General"),
            "difficulty": question.get("difficulty", "medium"),
            "question": question["question"],
            "options": options,

            "selected_answer": selected_answer,
            "selected_answer_text": options.get(selected_answer)
                if selected_answer else None,

            "correct_answer": correct_answer,
            "correct_answer_text": options.get(correct_answer),

            "is_correct": is_correct,
            "explanation": question.get(
                "explanation",
                "No explanation available for this question."
            )
        })

    # Save the quiz attempt
    attempt = QuizAttempt(
        student_id=student_id,
        course_id=session.course_id,
        questions=questions,
        answers=submission.answers,
        score=result["score_percentage"],
        total_questions=result["total_questions"]
    )

    session.is_submitted = True

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "message": "Quiz submitted successfully",
        "attempt_id": attempt.id,
        "session_id": session.id,
        "student_id": student_id,
        "course_id": session.course_id,
        "provider": session.provider,

        "correct_answers": result["correct_answers"],
        "incorrect_answers": (
            result["total_questions"] - result["correct_answers"]
        ),
        "total_questions": result["total_questions"],
        "score_percentage": result["score_percentage"],

        "review": review,
        "status": "scored"
    }


# Receive, validate and score quiz submissions
@app.post("/students/{student_id}/quiz/submit")
def submit_quiz(
    student_id: int,
    submission: QuizSubmission,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    questions = get_questions(submission.course_id)

    if not questions:
        raise HTTPException(
            status_code=404,
            detail="Quiz not found for this course"
        )

    question_lookup = {
        question["id"]: question
        for question in questions
    }

    for question_id, answer in submission.answers.items():
        if question_id not in question_lookup:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid question ID: {question_id}"
            )

        if answer not in question_lookup[question_id]["options"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid answer for question: {question_id}"
            )

    result = calculate_score(
        submission.course_id,
        submission.answers
    )

    quiz_attempt = QuizAttempt(
        student_id=student_id,
        course_id=submission.course_id.upper(),
        questions=[question["id"] for question in questions],
        answers=submission.answers,
        score=result["score_percentage"],
        total_questions=result["total_questions"]
    )

    db.add(quiz_attempt)
    db.commit()
    db.refresh(quiz_attempt)

    return {
        "message": "Quiz submitted successfully",
        "student_id": student_id,
        "course_id": submission.course_id.upper(),
        "answers_received": len(submission.answers),
        "correct_answers": result["correct_answers"],
        "total_questions": result["total_questions"],
        "score_percentage": result["score_percentage"],
        "attempt_id": quiz_attempt.id,
        "status": "scored"
    }


# Retrieve a student's quiz history
@app.get("/students/{student_id}/quiz/history")
def get_quiz_history(
    student_id: int,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        Student.id == student_id
    ).first()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found"
        )

    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id
    ).order_by(
        QuizAttempt.created_at.desc()
    ).all()

    return {
        "student_id": student_id,
        "total_attempts": len(attempts),
        "attempts": [
            {
                "attempt_id": attempt.id,
                "course_id": attempt.course_id,
                "score": attempt.score,
                "total_questions": attempt.total_questions,
                "answers": attempt.answers,
                "created_at": attempt.created_at
            }
            for attempt in attempts
        ]
    }
