from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.schemas.user_schema import UserRegister, UserLogin
from app.crud.user_crud import (
    get_user_by_email,
    create_user
)

from passlib.context import CryptContext
from jose import jwt

from datetime import datetime, timedelta

router = APIRouter(
    tags=["Authentication"]
)

# Password Hashing Setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT CONFIG
SECRET_KEY = "mysecretkey123"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Signup Model
class SignupModel(BaseModel):

    name: str = Field(..., min_length=2, max_length=100)

    email: EmailStr

    phone_number: str = Field(..., min_length=7, max_length=20)

    password: str = Field(..., min_length=8)

    confirm_password: str

    terms_accepted: bool

# Login Model
class LoginModel(BaseModel):

    email: EmailStr

    password: str

# Helpers
def hash_password(password: str):

    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
):

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# ======================================================
# JWT TOKEN
# ======================================================

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return token

# REGISTER API
@router.post("/register")
def register(
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
            terms_accepted=user.terms_accepted,
            confirm_password=user.confirm_password
        )

        return {
            "message": "Registration successful."
        }

    except HTTPException:
        raise

    except Exception as e:

# LOGIN API (WITH JWT)
@router.post("/login")
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):

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
                "sub": db_user.email
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
                "status": db_user.status
            }

        }

    except HTTPException:
        raise

    except Exception as e:
<<<<<<< Updated upstream
        raise HTTPException(status_code=500, detail=str(e))
