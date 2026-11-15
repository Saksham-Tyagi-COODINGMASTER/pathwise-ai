
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)
from google.auth.transport import requests
from google.oauth2 import id_token
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User


load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# Read JWT tokens from Authorization headers
bearer_scheme = HTTPBearer(auto_error=False)


class GoogleLoginRequest(BaseModel):
    credential: str


def create_access_token(user_id: int):
    if not SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Authentication secret is not configured"
        )

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# Identify the currently logged-in user
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication token is required"
        )

    if not SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Authentication secret is not configured"
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload.get("sub"))

    except (jwt.InvalidTokenError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# Google Login
@router.post("/google")
def google_login(
    request_data: GoogleLoginRequest,
    db: Session = Depends(get_db)
):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="Google Client ID is not configured"
        )

    try:
        google_user = id_token.verify_oauth2_token(
            request_data.credential,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        if not google_user.get("email_verified"):
            raise HTTPException(
                status_code=401,
                detail="Google email is not verified"
            )

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google authentication"
        )

    google_sub = google_user["sub"]
    email = google_user["email"]

    user = db.query(User).filter(
        User.google_sub == google_sub
    ).first()

    if not user:
        user = User(
            google_sub=google_sub,
            email=email,
            name=google_user.get("name", "Pathwise User"),
            picture=google_user.get("picture")
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
            "onboarding_completed": user.onboarding_completed
        }
    }
