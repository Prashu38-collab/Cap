from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.security.jwt_handler import get_current_user

from app.security.password import (
    verify_password,
    hash_password
)

from app.schemas.profile_schema import (
    ProfileUpdate,
    ChangePassword
)

from app.crud.profile_crud import (
    get_profile,
    update_profile,
    change_password,
    delete_profile
)

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

@router.get("")
def profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    user = get_profile(
        db,
        current_user["email"]
    )

    if not user:
        raise HTTPException(404, "User not found")

    return user

@router.put("")
def edit_profile(
    data: ProfileUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    update_profile(
        db,
        current_user["email"],
        data.name,
        data.phone_number
    )

    return {
        "message": "Profile updated successfully"
    }

@router.put("/change-password")
def update_password(
    data: ChangePassword,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    from app.crud.user_crud import get_user_by_email

    full_user = get_user_by_email(
        db,
        current_user["email"]
    )

    if not verify_password(
        data.current_password,
        full_user.password
    ):
        raise HTTPException(400, "Current password is incorrect.")

    if data.new_password != data.confirm_password:
        raise HTTPException(400, "Passwords do not match.")

    hashed = hash_password(
        data.new_password
    )

    change_password(
        db,
        current_user["email"],
        hashed
    )

    return {
        "message": "Password changed successfully"
    }