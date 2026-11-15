
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from pathlib import Path

# Store the database inside the backend folder
BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{(BASE_DIR / 'pathwise.db').as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
