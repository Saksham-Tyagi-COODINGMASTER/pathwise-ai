
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    JSON,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint
)
from datetime import datetime, timezone

from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)

    # Link student profile to Google-authenticated user
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=True,
        index=True
    )

    name = Column(String, nullable=False)
    programme = Column(String, nullable=False)
    year = Column(Integer, nullable=False)

    # Keep legacy single-goal field for existing features
    goal = Column(String, nullable=False)

    # Store multiple onboarding goals
    goals = Column(JSON, default=list)

    hours_per_week = Column(Float, nullable=False)

    skills = Column(JSON, default=list)
    completed_courses = Column(JSON, default=list)
    learning_preferences = Column(JSON, default=list)

    # Curriculum assignment (nullable to preserve existing student profiles)
    institute = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    admission_year = Column(Integer, nullable=True)
    current_semester = Column(Integer, nullable=True)
    curriculum_version = Column(String, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    google_sub = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)

    onboarding_completed = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0"
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class StudentCourseProgress(Base):
    __tablename__ = "student_course_progress"
    __table_args__ = (UniqueConstraint("student_id", "course_key", name="uq_student_course_progress"),)

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    course_key = Column(String, nullable=False, index=True)
    completed = Column(Boolean, nullable=False, default=False, server_default="0")
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
