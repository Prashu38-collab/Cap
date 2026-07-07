from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from app.database import get_db

import re

from app.schemas.admin_schema import (
    AdminCreateUser,
    StatusUpdate
)

from app.crud.admin_crud import (
    get_dashboard_stats
)

from app.crud.user_crud import (
    get_all_users,
    get_user_by_email,
    create_user,
    delete_user,
    update_user_status
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)

# Pydantic Models

class AdminCreateUser(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    password: str

class StatusUpdate(BaseModel):
    status: str

# DASHBOARD STATISTICS

@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db)
):

    return get_dashboard_stats(db)

# GET ALL USERS

@router.get("/users")
def get_users(
    db: Session = Depends(get_db)
):

    users = get_all_users(db)

    return [
        {
            "id": user.user_id,
            "name": user.name,
            "email": user.email,
            "phone_number": user.phone_number,
            "status": user.status
        }
        for user in users
    ]


# CREATE USER

@router.post("/users")
def add_user(
    user: AdminCreateUser,
    db: Session = Depends(get_db)
):

    # ---------------- Name Validation ----------------

    if len(user.name.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Name must contain at least 3 characters."
        )

    # ---------------- Phone Validation ----------------

    if not re.fullmatch(r"\d{10}", user.phone_number):
        raise HTTPException(
            status_code=400,
            detail="Phone number must contain exactly 10 digits."
        )

    # ---------------- Password Validation ----------------

    password = user.password

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters."
        )

    if len(password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password is too long."
        )

    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one uppercase letter."
        )

    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one lowercase letter."
        )

    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one number."
        )

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one special character."
        )

    # ---------------- Duplicate Email ----------------

    existing = get_user_by_email(
        db,
        user.email
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already exists."
        )

    # ---------------- Hash Password ----------------

    hashed_password = pwd_context.hash(password)

    # ---------------- Create User ----------------

    create_user(
        db=db,
        name=user.name,
        email=user.email,
        phone_number=user.phone_number,
        hashed_password=hashed_password,
        terms_accepted=True,
        confirm_password=password,
        otp=None,
        otp_expiry=None
    )

    created_user = get_user_by_email(
        db,
        user.email
    )

    update_user_status(
        db,
        created_user.user_id,
        "Active"
    )

    return {
        "message": "User created successfully."
    }

# DELETE USER

@router.delete("/users/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db)
):

    success = delete_user(
        db,
        user_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "message": "User deleted successfully."
    }


# UPDATE USER STATUS

@router.put("/users/{user_id}/status")
def change_status(
    user_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db)
):

    if data.status not in [
        "Active",
        "Inactive",
        "Locked"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status."
        )

    success = update_user_status(
        db,
        user_id,
        data.status
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "message": f"User status updated to {data.status}."
    }

