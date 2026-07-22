from fastapi import Request, APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.main import limiter

from app.config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_NAME
)

from app.security.admin_auth import admin_login

from app.security.password import (
    hash_password,
    verify_password
)

from app.security.jwt_handler import (
    create_access_token
)

from app.database import get_db
from app.schemas.user_schema import UserRegister, UserLogin
from app.crud.user_crud import (
    get_user_by_email,
    create_user
)

router = APIRouter(
    tags=["Authentication"]
)

# Signup Model
class SignupModel(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    password: str
    confirm_password: str
    terms_accepted: bool

# Login Model
class LoginModel(BaseModel):
    email: EmailStr
    password: str

# Register
@router.post("/register")
@limiter.limit("3/minute")
def register(
    request: Request,
    user: UserRegister,
    db: Session = Depends(get_db)
):
    try:
        if not user.terms_accepted:
            raise HTTPException(
                status_code=400,
                detail="Please accept Terms and Conditions."
            )

        if user.password != user.confirm_password:
            raise HTTPException(
                status_code=400,
                detail="Passwords do not match."
            )

        existing_user = get_user_by_email(
            db,
            user.email
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered."
            )

        hashed_password = hash_password(
            user.password
        )

        create_user(
            db=db,
            name=user.name,
            email=user.email,
            phone_number=user.phone_number,
            hashed_password=hashed_password,
            terms_accepted=user.terms_accepted
        )

        return {
            "message": "Registration successful."
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Login
@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    user: UserLogin,
    db: Session = Depends(get_db)
):
    
    # Admin login
    if user.email == ADMIN_EMAIL:
        return admin_login(
            user.email,
            user.password
        )

    # User Login
    db_user = get_user_by_email(
        db,
        user.email
    )

    try:
        if not db_user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )
        
        if db_user.status == "Locked":
            raise HTTPException(
                status_code=403,
                detail="Your account has been locked by the administrator."
            )

        if db_user.status == "Inactive":
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before logging in."
            )

        if not verify_password(
            user.password,
            db_user.password
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid password."
            )

        token = create_access_token(
            {
                "sub": db_user.email,
                "role": "user"
            }
        )

        return {
            "message": "Login successful",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": db_user.user_id,
                "name": db_user.name,
                "email": db_user.email,
                "status": db_user.status,
                "role": "user"
            }
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    