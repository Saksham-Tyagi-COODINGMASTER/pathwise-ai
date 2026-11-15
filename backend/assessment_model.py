from sqlalchemy import Column, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func

from database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=False
    )

    skill_levels = Column(JSON, default=dict)
    interests = Column(JSON, default=list)
    confidence_levels = Column(JSON, default=dict)
    available_hours = Column(Integer, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )