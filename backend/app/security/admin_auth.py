from fastapi import HTTPException

from app.config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_NAME
)

from app.security.jwt_handler import create_access_token


def admin_login(email: str, password: str):

    if email != ADMIN_EMAIL:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin email."
        )

    if password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid admin password."
        )

    token = create_access_token(
        {
            "sub": ADMIN_EMAIL,
            "role": "admin"
        }
    )

    return {
        "message": "Admin login successful",
        "access_token": token,
        "token_type": "bearer",
        "admin": {
            "name": ADMIN_NAME,
            "email": ADMIN_EMAIL,
            "role": "admin"
        }
    }