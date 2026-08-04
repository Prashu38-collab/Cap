import os
import re
from dotenv import load_dotenv
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, field_validator, EmailStr, Field
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from ..database import get_db

load_dotenv()

# ======================================================
# SECURITY CONFIGURATION
# ======================================================

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


# ======================================================
# REQUEST MODELS
# ======================================================

class SignupModel(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=20)
    password: str = Field(..., min_length=8)
    confirm_password: str
    terms_accepted: bool

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 characters.")
        if len(value) > 50:
            raise ValueError("Name cannot exceed 50 characters.")
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise ValueError("Name can contain only alphabets and spaces.")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str):
        value = value.strip()
        if not value.isdigit():
            raise ValueError("Phone number must contain digits only.")
        if len(value) != 10:
            raise ValueError("Phone number must contain exactly 10 digits.")
        if not value.startswith(("98", "97")):
            raise ValueError("Enter a valid Nepal phone number.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        if " " in value:
            raise ValueError("Password cannot contain spaces.")
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(value) > 20:
            raise ValueError("Password cannot exceed 20 characters.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain at least one number.")
        if not re.search(r"[!@#$%^&*()_\-+=\[\]{}|\\:;\"'<>,.?/]", value):
            raise ValueError("Password must contain at least one special character.")
        weak_passwords = [
            "Password123@", "Admin123@", "Qwerty123@", "Welcome123@"
        ]
        if value in weak_passwords:
            raise ValueError("This password is too common. Please choose a stronger password.")
        return value


class LoginModel(BaseModel):
    email: EmailStr
    password: str


class OTPVerificationModel(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ResendOTPModel(BaseModel):
    email: EmailStr


class ForgotPasswordModel(BaseModel):
    email: EmailStr


class VerifyResetOTPModel(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ResetPasswordModel(BaseModel):
    email: EmailStr
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value):
        if " " in value:
            raise ValueError("Password cannot contain spaces.")
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(value) > 20:
            raise ValueError("Password cannot exceed 20 characters.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain one uppercase letter.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain one lowercase letter.")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain one number.")
        if not re.search(r"[!@#$%^&*()_\-+=\[\]{}|\\:;\"'<>,.?/]", value):
            raise ValueError("Password must contain one special character.")
        return value


class UpdateProfileModel(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=7, max_length=20)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Name must contain at least 2 characters.")
        if len(value) > 50:
            raise ValueError("Name cannot exceed 50 characters.")
        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise ValueError("Name can contain only alphabets and spaces.")
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value):
        value = value.strip()
        if not value.isdigit():
            raise ValueError("Phone number must contain digits only.")
        if len(value) != 10:
            raise ValueError("Phone number must contain exactly 10 digits.")
        if not value.startswith(("98", "97")):
            raise ValueError("Enter a valid Nepal phone number.")
        return value


class ChangePasswordModel(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value):
        if " " in value:
            raise ValueError("Password cannot contain spaces.")
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(value) > 20:
            raise ValueError("Password cannot exceed 20 characters.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain one uppercase letter.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain one lowercase letter.")
        if not re.search(r"\d", value):
            raise ValueError("Password must contain one number.")
        if not re.search(r"[!@#$%^&*()_\-+=\[\]{}|\\:;\"'<>,.?/]", value):
            raise ValueError("Password must contain one special character.")
        return value


# ======================================================
# PASSWORD FUNCTIONS
# ======================================================

def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


# ======================================================
# JWT TOKEN
# ======================================================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ======================================================
# GET CURRENT USER
# ======================================================

def get_current_user(
    credentials=Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user_id = payload.get("user_id")
        if email is None:
            raise credentials_exception
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.execute(
        text("""
            SELECT
                user_id,
                name,
                email,
                phone_number,
                is_verified,
                status
            FROM users
            WHERE user_id = :user_id
        """),
        {"user_id": user_id}
    ).fetchone()

    if user is None:
        raise credentials_exception

    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "phone_number": user.phone_number,
        "is_verified": user.is_verified,
        "status": user.status
    }
