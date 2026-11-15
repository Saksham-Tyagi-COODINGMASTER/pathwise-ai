
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    JSON,
    DateTime,
    Float,
    Boolean
)
from sqlalchemy.sql import func

from database import Base


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    course_id = Column(String, nullable=False)

    # Store the complete generated questions securely
    questions = Column(JSON, nullable=False)

    difficulty = Column(String, nullable=False)

    provider = Column(String, nullable=False)

    is_submitted = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    course_id = Column(String, nullable=False)

    # Store question snapshots for accurate historical results
    questions = Column(JSON, default=list)
    answers = Column(JSON, default=list)

    score = Column(Float, nullable=False)

    total_questions = Column(Integer, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
