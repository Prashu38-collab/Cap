from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    status

)
import random
import re
from ..services.email_services import send_otp_email


from fastapi.security import HTTPBearer

from sqlalchemy.orm import Session
from sqlalchemy import text

from pydantic import (
    BaseModel,
    field_validator,
    EmailStr,
    Field
)

from jose import (
    JWTError,
    jwt
)

from passlib.context import CryptContext

from datetime import (
    datetime,
    timedelta,
    timezone
)

from ..database import get_db


router = APIRouter(tags=["Authentication"])


# ======================================================
# SECURITY CONFIGURATION
# ======================================================

SECRET_KEY = "mysecretkey123"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

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

        # -----------------------------
    # Validate Name
    # -----------------------------
    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str):

        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "Name must contain at least 2 characters."
            )

        if len(value) > 50:
            raise ValueError(
                "Name cannot exceed 50 characters."
            )

        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise ValueError(
                "Name can contain only alphabets and spaces."
            )

        return value


    # -----------------------------
    # Validate Phone Number
    # -----------------------------
    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str):

        value = value.strip()

        if not value.isdigit():
            raise ValueError(
                "Phone number must contain digits only."
            )

        if len(value) != 10:
            raise ValueError(
                "Phone number must contain exactly 10 digits."
            )

        if not value.startswith(("98", "97")):
            raise ValueError(
                "Enter a valid Nepal phone number."
            )

        return value


    # -----------------------------
    # Validate Password
    # -----------------------------
    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):

        if " " in value:
            raise ValueError(
                "Password cannot contain spaces."
            )

        if len(value) < 8:
            raise ValueError(
                "Password must be at least 8 characters long."
            )

        if len(value) > 20:
            raise ValueError(
                "Password cannot exceed 20 characters."
            )

        if not re.search(r"[A-Z]", value):
            raise ValueError(
                "Password must contain at least one uppercase letter."
            )

        if not re.search(r"[a-z]", value):
            raise ValueError(
                "Password must contain at least one lowercase letter."
            )

        if not re.search(r"\d", value):
            raise ValueError(
                "Password must contain at least one number."
            )

        if not re.search(r"[!@#$%^&*()_\-+=\[\]{}|\\:;\"'<>,.?/]", value):
            raise ValueError(
                "Password must contain at least one special character."
            )

        weak_passwords = [
            "Password123@",
            "Admin123@",
            "Qwerty123@",
            "Welcome123@"
        ]

        if value in weak_passwords:
            raise ValueError(
                "This password is too common. Please choose a stronger password."
            )

        return value


class LoginModel(BaseModel):

    email: EmailStr

    password: str

class OTPVerificationModel(BaseModel):

    email: EmailStr

    otp: str = Field(..., min_length=6, max_length=6)

class ResendOTPModel(BaseModel):

    email: EmailStr


# ======================================================
# FORGOT PASSWORD MODEL
# ======================================================

class ForgotPasswordModel(BaseModel):

    email: EmailStr


# ======================================================
# VERIFY RESET OTP MODEL
# ======================================================

class VerifyResetOTPModel(BaseModel):

    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


# ======================================================
# RESET PASSWORD MODEL
# ======================================================

class ResetPasswordModel(BaseModel):

    email: EmailStr

    new_password: str

    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value):

        if " " in value:
            raise ValueError(
                "Password cannot contain spaces."
            )

        if len(value) < 8:
            raise ValueError(
                "Password must be at least 8 characters."
            )

        if len(value) > 20:
            raise ValueError(
                "Password cannot exceed 20 characters."
            )

        if not re.search(r"[A-Z]", value):
            raise ValueError(
                "Password must contain one uppercase letter."
            )

        if not re.search(r"[a-z]", value):
            raise ValueError(
                "Password must contain one lowercase letter."
            )

        if not re.search(r"\d", value):
            raise ValueError(
                "Password must contain one number."
            )

        if not re.search(r"[!@#$%^&*()_\-+=\[\]{}|\\:;\"'<>,.?/]", value):
            raise ValueError(
                "Password must contain one special character."
            )

        return value
# ======================================================
# PASSWORD FUNCTIONS
# ======================================================

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

    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {
            "exp": expire
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# ======================================================
# GET CURRENT USER
# ======================================================

def get_current_user(
    credentials = Depends(security),
    db: Session = Depends(get_db)
):

    token = credentials.credentials

    credentials_exception = HTTPException(

        status_code=status.HTTP_401_UNAUTHORIZED,

        detail="Invalid or expired token",

        headers={
            "WWW-Authenticate": "Bearer"
        }

    )

    try:

        payload = jwt.decode(

            token,

            SECRET_KEY,

            algorithms=[ALGORITHM]

        )

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
                is_verified
            FROM users
            WHERE user_id = :user_id
        """),
        {
            "user_id": user_id
        }
    ).fetchone()

    if user is None:
        raise credentials_exception

    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "phone_number": user.phone_number,
        "is_verified": user.is_verified
    }


# ======================================================
# REGISTER USER
# ======================================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user: SignupModel,
    db: Session = Depends(get_db)
):
    try:

        # -----------------------------
        # Check Terms & Conditions
        # -----------------------------
        if not user.terms_accepted:
            raise HTTPException(
                status_code=400,
                detail="You must accept the Terms & Conditions."
            )

        # -----------------------------
        # Password Match
        # -----------------------------
        if user.password != user.confirm_password:
            raise HTTPException(
                status_code=400,
                detail="Passwords do not match."
            )

        # -----------------------------
        # Check Email Already Exists
        # -----------------------------
        existing_email = db.execute(
            text("""
                SELECT user_id
                FROM users
                WHERE LOWER(email)=LOWER(:email)
            """),
            {
                "email": user.email
            }
        ).fetchone()

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email is already registered."
            )
        # -----------------------------
        # Check Phone Number Already Exists
        # -----------------------------
        existing_phone = db.execute(
            text("""
                SELECT user_id
                FROM users
                WHERE phone_number = :phone_number
            """),
             {
                  "phone_number": user.phone_number
    }
        ).fetchone()

        if existing_phone:
            raise HTTPException(
        status_code=400,
        detail="Phone number is already registered."
    )

        # -----------------------------
        # Hash Password
        # -----------------------------
        hashed_password = hash_password(user.password)

        # -----------------------------
        # Generate OTP
        # -----------------------------
        otp = str(random.randint(100000, 999999))
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)

        # -----------------------------
        # Insert User
        # -----------------------------
        result = db.execute(
            text("""
                INSERT INTO users
                (
                    name,
                    email,
                    phone_number,
                    password,
                    terms_accepted,
                    is_verified,
                    otp,
                    otp_expiry
                )

                VALUES
                (
                    :name,
                    :email,
                    :phone_number,
                    :password,
                    :terms_accepted,
                    FALSE,
                    :otp,
                    :otp_expiry
                )

                RETURNING
                user_id,
                name,
                email
            """),
            {
                "name": user.name,
                "email": user.email,
                "phone_number": user.phone_number,
                "password": hashed_password,
                "terms_accepted": user.terms_accepted,
                "otp": otp,
                "otp_expiry": otp_expiry
            }
        )

        new_user = result.fetchone()

        email_sent = send_otp_email(
            user.email,
            otp
        )

        if not email_sent:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Failed to send verification email."
            )
        db.commit()

        return {

            "success": True,

            "message": "Registration successful. A verification OTP has been sent to your email.",

            "user": {

                "user_id": new_user.user_id,

                "name": new_user.name,

                "email": new_user.email

            }

        }

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )


# ======================================
# VERIFY OTP
# ======================================

@router.post("/verify-otp")
def verify_otp(
    data: OTPVerificationModel,
    db: Session = Depends(get_db)
):

    try:

        # Fetch user by email
        user = db.execute(
            text("""
                SELECT
                    user_id,
                    otp,
                    otp_expiry,
                    is_verified
                FROM users
                WHERE LOWER(email) = LOWER(:email)
            """),
            {
                "email": data.email
            }
        ).fetchone()

        # Check user exists
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        # Already verified
        if user.is_verified:
            return {
                "success": True,
                "message": "Email is already verified."
            }

        # OTP validation
        if user.otp != data.otp:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP."
            )

        # ===============================
        # OTP Expiry Validation
        # ===============================

        current_time = datetime.utcnow()

        expiry = user.otp_expiry

        # If database datetime has timezone, remove it
        if expiry is not None and expiry.tzinfo is not None:
            expiry = expiry.replace(tzinfo=None)

        if expiry is None:
            raise HTTPException(
                status_code=400,
                detail="OTP not found."
            )

        if current_time > expiry:
            raise HTTPException(
                status_code=400,
                detail="OTP has expired."
            )

        # ===============================
        # Mark user as verified
        # ===============================

        db.execute(
            text("""
                UPDATE users
                SET
                    is_verified = TRUE,
                    otp = NULL,
                    otp_expiry = NULL
                WHERE user_id = :user_id
            """),
            {
                "user_id": user.user_id
            }
        )

        db.commit()

        return {
            "success": True,
            "message": "Email verified successfully. You can now login."
        }

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ======================================
# RESEND OTP
# ======================================

@router.post("/resend-otp")
def resend_otp(
    data: ResendOTPModel,
    db: Session = Depends(get_db)
):

    try:

        user = db.execute(
            text("""
                SELECT
                    user_id,
                    email,
                    is_verified
                FROM users
                WHERE LOWER(email)=LOWER(:email)
            """),
            {
                "email": data.email
            }
        ).fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        if user.is_verified:
            raise HTTPException(
                status_code=400,
                detail="This email is already verified."
            )

        otp = str(random.randint(100000, 999999))

        otp_expiry = datetime.utcnow() + timedelta(minutes=10)

        db.execute(
            text("""
                UPDATE users
                SET
                    otp = :otp,
                    otp_expiry = :otp_expiry
                WHERE user_id = :user_id
            """),
            {
                "otp": otp,
                "otp_expiry": otp_expiry,
                "user_id": user.user_id
            }
        )

        email_sent = send_otp_email(
            user.email,
            otp
        )

        if not email_sent:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP email."
            )

        db.commit()

        return {

            "success": True,

            "message": "A new OTP has been sent to your email."

        }

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
 # ======================================================
# LOGIN USER
# ======================================================

@router.post("/login")
def login(
    user: LoginModel,
    db: Session = Depends(get_db)
):

    try:

        db_user = db.execute(
            text("""
                SELECT
                    user_id,
                    name,
                    email,
                    password,
                    is_verified
                FROM users
                WHERE LOWER(email)=LOWER(:email)
            """),
            {
                "email": user.email
            }
        ).fetchone()

        if not db_user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        # Check whether email has been verified
        if not db_user.is_verified:
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before logging in."
            )

        # Check password
        if not verify_password(
            user.password,
            db_user.password
        ):
            raise HTTPException(
                status_code=401,
                detail="Incorrect password."
            )

        # Create JWT
        access_token = create_access_token(
            data={
                "sub": db_user.email,
                "user_id": db_user.user_id
            }
        )

        return {

            "success": True,

            "message": "Login successful.",

            "access_token": access_token,

            "token_type": "bearer",

            "user": {

                "user_id": db_user.user_id,

                "name": db_user.name,

                "email": db_user.email

            }

        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
# ======================================================
# FORGOT PASSWORD
# ======================================================

@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordModel,
    db: Session = Depends(get_db)
):

    try:

        # -----------------------------
        # Check User Exists
        # -----------------------------
        user = db.execute(
            text("""
                SELECT
                    user_id,
                    email,
                    is_verified
                FROM users
                WHERE LOWER(email)=LOWER(:email)
            """),
            {
                "email": data.email
            }
        ).fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="No account found with this email."
            )

        if not user.is_verified:
            raise HTTPException(
                status_code=400,
                detail="Please verify your email before resetting your password."
            )

        # -----------------------------
        # Generate OTP
        # -----------------------------
        otp = str(random.randint(100000, 999999))

        otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

        # -----------------------------
        # Save OTP
        # -----------------------------
        db.execute(
            text("""
                UPDATE users
                SET
                    otp = :otp,
                    otp_expiry = :expiry
                WHERE user_id = :user_id
            """),
            {
                "otp": otp,
                "expiry": otp_expiry,
                "user_id": user.user_id
            }
        )

        db.commit()

        # -----------------------------
        # Send Email
        # -----------------------------
        email_sent = send_otp_email(
            data.email,
            otp
        )

        if not email_sent:
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP."
            )

        return {

            "success": True,

            "message":
            "Password reset OTP has been sent to your email."

        }

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ======================================================
# VERIFY RESET OTP
# ======================================================

@router.post("/verify-reset-otp")
def verify_reset_otp(
    data: VerifyResetOTPModel,
    db: Session = Depends(get_db)
):

    try:

        # -----------------------------
        # Get User
        # -----------------------------
        user = db.execute(
            text("""
                SELECT
                    user_id,
                    otp,
                    otp_expiry
                FROM users
                WHERE LOWER(email)=LOWER(:email)
            """),
            {
                "email": data.email
            }
        ).fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        # -----------------------------
        # OTP Match
        # -----------------------------
        if user.otp != data.otp:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP."
            )

        # -----------------------------
        # OTP Expiry
        # -----------------------------
        expiry = user.otp_expiry

        if expiry is None:
            raise HTTPException(
                status_code=400,
                detail="OTP has expired."
            )

        # Handle timezone-aware/naive datetime
        if expiry.tzinfo is not None:
            expiry = expiry.replace(tzinfo=None)

        if datetime.utcnow() > expiry:
            raise HTTPException(
                status_code=400,
                detail="OTP has expired."
            )

        return {

            "success": True,

            "message": "OTP verified successfully."

        }

    except HTTPException:
        raise

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    
# ======================================================
# RESET PASSWORD
# ======================================================

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordModel,
    db: Session = Depends(get_db)
):

    try:

        # -----------------------------
        # Password Match
        # -----------------------------
        if data.new_password != data.confirm_password:
            raise HTTPException(
                status_code=400,
                detail="Passwords do not match."
            )

        # -----------------------------
        # Get User
        # -----------------------------
        user = db.execute(
            text("""
                SELECT
                    user_id
                FROM users
                WHERE LOWER(email)=LOWER(:email)
            """),
            {
                "email": data.email
            }
        ).fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        # -----------------------------
        # Hash Password
        # -----------------------------
        hashed_password = hash_password(
            data.new_password
        )

        # -----------------------------
        # Update Password
        # -----------------------------
        db.execute(
            text("""
                UPDATE users
                SET
                    password = :password,
                    otp = NULL,
                    otp_expiry = NULL
                WHERE user_id = :user_id
            """),
            {
                "password": hashed_password,
                "user_id": user.user_id
            }
        )

        db.commit()

        return {

            "success": True,

            "message": "Password reset successfully."

        }

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
# ======================================================
# USER PROFILE
# ======================================================

@router.get("/me")
def get_my_profile(
    current_user: dict = Depends(get_current_user)
):

    return {
        "success": True,
        "user": current_user
    }

# ======================================================
# GET USER SAVED ITINERARIES
# ======================================================

@router.get("/me/itineraries")
def get_saved_itineraries(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    try:

        itineraries = db.execute(
            text("""
                SELECT
                    preference_id,
                    travel_date,
                    travel_days,
                    category,
                    total_budget,
                    hotel_budget,
                    starting_district,
                    ending_district,
                    budget_level
                FROM user_preferences
                WHERE user_id = :user_id
                ORDER BY preference_id DESC
            """),
            {
                "user_id": current_user["user_id"]
            }
        ).fetchall()

        return {
            "success": True,
            "count": len(itineraries),
            "saved_itineraries": [
                dict(row._mapping)
                for row in itineraries
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ======================================================
# GET SINGLE ITINERARY
# ======================================================

@router.get("/me/itineraries/{preference_id}")
def get_itinerary_details(
    preference_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    try:

        itinerary = db.execute(
            text("""
                SELECT *
                FROM user_preferences
                WHERE preference_id = :preference_id
                AND user_id = :user_id
            """),
            {
                "preference_id": preference_id,
                "user_id": current_user["user_id"]
            }
        ).fetchone()

        if not itinerary:
            raise HTTPException(
                status_code=404,
                detail="Itinerary not found."
            )

        return {
            "success": True,
            "itinerary": dict(itinerary._mapping)
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )