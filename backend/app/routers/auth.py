import random
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone, timedelta
from ..services.email_services import send_otp_email
from ..database import get_db

from .auth_utils import (
    SignupModel,
    LoginModel,
    OTPVerificationModel,
    ResendOTPModel,
    ForgotPasswordModel,
    VerifyResetOTPModel,
    ResetPasswordModel,
    UpdateProfileModel,
    ChangePasswordModel,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(tags=["Authentication"])


# ======================================================
# REGISTER USER
# ======================================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: SignupModel, db: Session = Depends(get_db)):
    try:
        if not user.terms_accepted:
            raise HTTPException(status_code=400, detail="You must accept the Terms & Conditions.")

        if user.password != user.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match.")

        existing_email = db.execute(
            text("SELECT user_id FROM users WHERE LOWER(email)=LOWER(:email)"),
            {"email": user.email}
        ).fetchone()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email is already registered.")

        existing_phone = db.execute(
            text("SELECT user_id FROM users WHERE phone_number = :phone_number"),
            {"phone_number": user.phone_number}
        ).fetchone()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number is already registered.")

        hashed_password = hash_password(user.password)
        otp = str(random.randint(100000, 999999))
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)

        result = db.execute(
            text("""
                INSERT INTO users (name, email, phone_number, password, terms_accepted, is_verified, otp, otp_expiry, status)
                VALUES (:name, :email, :phone_number, :password, :terms_accepted, FALSE, :otp, :otp_expiry, 'Inactive')
                RETURNING user_id, name, email
            """),
            {
                "name": user.name, "email": user.email, "phone_number": user.phone_number,
                "password": hashed_password, "terms_accepted": user.terms_accepted,
                "otp": otp, "otp_expiry": otp_expiry
            }
        )
        new_user = result.fetchone()

        email_sent = send_otp_email(user.email, otp)
        if not email_sent:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to send verification email.")
        db.commit()

        return {
            "success": True,
            "message": "Registration successful. A verification OTP has been sent to your email.",
            "user": {"user_id": new_user.user_id, "name": new_user.name, "email": new_user.email}
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


# ======================================
# VERIFY OTP
# ======================================

@router.post("/verify-otp")
def verify_otp(data: OTPVerificationModel, db: Session = Depends(get_db)):
    try:
        user = db.execute(
            text("SELECT user_id, otp, otp_expiry, is_verified FROM users WHERE LOWER(email)=LOWER(:email)"),
            {"email": data.email}
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        if user.is_verified:
            return {"success": True, "message": "Email is already verified."}
        if user.otp != data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP.")

        current_time = datetime.utcnow()
        expiry = user.otp_expiry
        if expiry is not None and expiry.tzinfo is not None:
            expiry = expiry.replace(tzinfo=None)
        if expiry is None:
            raise HTTPException(status_code=400, detail="OTP not found.")
        if current_time > expiry:
            raise HTTPException(status_code=400, detail="OTP has expired.")

        db.execute(
            text("UPDATE users SET is_verified=TRUE, status='Active', otp=NULL, otp_expiry=NULL WHERE user_id=:user_id"),
            {"user_id": user.user_id}
        )
        db.commit()
        return {"success": True, "message": "Email verified successfully. You can now login."}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================
# RESEND OTP
# ======================================

@router.post("/resend-otp")
def resend_otp(data: ResendOTPModel, db: Session = Depends(get_db)):
    try:
        user = db.execute(
            text("SELECT user_id, email, is_verified FROM users WHERE LOWER(email)=LOWER(:email)"),
            {"email": data.email}
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        if user.is_verified:
            raise HTTPException(status_code=400, detail="This email is already verified.")

        otp = str(random.randint(100000, 999999))
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)

        db.execute(
            text("UPDATE users SET otp=:otp, otp_expiry=:otp_expiry WHERE user_id=:user_id"),
            {"otp": otp, "otp_expiry": otp_expiry, "user_id": user.user_id}
        )

        email_sent = send_otp_email(user.email, otp)
        if not email_sent:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to send OTP email.")

        db.commit()
        return {"success": True, "message": "A new OTP has been sent to your email."}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# LOGIN USER
# ======================================================

@router.post("/login")
def login(user: LoginModel, db: Session = Depends(get_db)):
    try:
        db_user = db.execute(
            text("SELECT user_id, name, email, password, is_verified, status FROM users WHERE LOWER(email)=LOWER(:email)"),
            {"email": user.email}
        ).fetchone()

        if not db_user:
            raise HTTPException(status_code=404, detail="User not found.")
        if not db_user.is_verified:
            raise HTTPException(status_code=403, detail="Please verify your email before logging in.")
        if db_user.status == "Inactive":
            raise HTTPException(status_code=403, detail="Your account is inactive. Please contact support.")
        if db_user.status == "Locked":
            raise HTTPException(status_code=403, detail="Your account has been locked. Please contact support.")
        if not verify_password(user.password, db_user.password):
            raise HTTPException(status_code=401, detail="Incorrect password.")

        access_token = create_access_token(data={"sub": db_user.email, "user_id": db_user.user_id})

        return {
            "success": True,
            "message": "Login successful.",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"user_id": db_user.user_id, "name": db_user.name, "email": db_user.email, "status": db_user.status}
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# FORGOT PASSWORD
# ======================================================

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordModel, db: Session = Depends(get_db)):
    try:
        user = db.execute(
            text("SELECT user_id, email, is_verified FROM users WHERE LOWER(email)=LOWER(:email)"),
            {"email": data.email}
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="No account found with this email.")
        if not user.is_verified:
            raise HTTPException(status_code=400, detail="Please verify your email before resetting your password.")

        otp = str(random.randint(100000, 999999))
        otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

        db.execute(
            text("UPDATE users SET otp=:otp, otp_expiry=:expiry WHERE user_id=:user_id"),
            {"otp": otp, "expiry": otp_expiry, "user_id": user.user_id}
        )
        db.commit()

        email_sent = send_otp_email(data.email, otp)
        if not email_sent:
            raise HTTPException(status_code=500, detail="Failed to send OTP.")

        return {"success": True, "message": "Password reset OTP has been sent to your email."}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# VERIFY RESET OTP
# ======================================================

@router.post("/verify-reset-otp")
def verify_reset_otp(data: VerifyResetOTPModel, db: Session = Depends(get_db)):
    try:
        user = db.execute(
            text("SELECT user_id, otp, otp_expiry FROM users WHERE LOWER(email)=LOWER(:email)"),
            {"email": data.email}
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        if user.otp != data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP.")

        expiry = user.otp_expiry
        if expiry is None:
            raise HTTPException(status_code=400, detail="OTP has expired.")
        if expiry.tzinfo is not None:
            expiry = expiry.replace(tzinfo=None)
        if datetime.utcnow() > expiry:
            raise HTTPException(status_code=400, detail="OTP has expired.")

        return {"success": True, "message": "OTP verified successfully."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# RESET PASSWORD
# ======================================================

@router.post("/reset-password")
def reset_password(data: ResetPasswordModel, db: Session = Depends(get_db)):
    try:
        if data.new_password != data.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match.")

        user = db.execute(
            text("SELECT user_id FROM users WHERE LOWER(email)=LOWER(:email)"),
            {"email": data.email}
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        hashed_password = hash_password(data.new_password)

        db.execute(
            text("UPDATE users SET password=:password, otp=NULL, otp_expiry=NULL WHERE user_id=:user_id"),
            {"password": hashed_password, "user_id": user.user_id}
        )
        db.commit()

        return {"success": True, "message": "Password reset successfully."}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# USER PROFILE
# ======================================================

@router.get("/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": current_user}


# ======================================================
# UPDATE PROFILE
# ======================================================

@router.put("/me")
def update_profile(
    data: UpdateProfileModel,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db.execute(
            text("UPDATE users SET name=:name, phone_number=:phone_number WHERE user_id=:user_id"),
            {"name": data.name, "phone_number": data.phone_number, "user_id": current_user["user_id"]}
        )
        db.commit()

        return {
            "success": True,
            "message": "Profile updated successfully.",
            "user": {
                "user_id": current_user["user_id"],
                "name": data.name,
                "email": current_user["email"],
                "phone_number": data.phone_number,
                "is_verified": current_user["is_verified"],
                "status": current_user["status"]
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# CHANGE PASSWORD
# ======================================================

@router.put("/change-password")
def change_password(
    data: ChangePasswordModel,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if data.new_password != data.confirm_password:
            raise HTTPException(status_code=400, detail="New passwords do not match.")

        user = db.execute(
            text("SELECT user_id, password FROM users WHERE user_id=:user_id"),
            {"user_id": current_user["user_id"]}
        ).fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        if not verify_password(data.current_password, user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

        hashed_password = hash_password(data.new_password)

        db.execute(
            text("UPDATE users SET password=:password WHERE user_id=:user_id"),
            {"password": hashed_password, "user_id": current_user["user_id"]}
        )
        db.commit()

        return {"success": True, "message": "Password changed successfully."}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


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
                    p.preference_id, p.travel_date, p.travel_days, p.category,
                    p.total_budget, p.hotel_budget, p.starting_district,
                    p.ending_district, p.budget_level,
                    g.itinerary_id, g.itinerary_data, g.generated_at,
                    g.total_estimated_cost
                FROM "User_Preferences" p
                LEFT JOIN generated_itineraries g ON g.preference_id = p.preference_id
                WHERE p.user_id = :user_id
                ORDER BY p.preference_id DESC
            """),
            {"user_id": current_user["user_id"]}
        ).fetchall()

        results = []
        for row in itineraries:
            r = dict(row._mapping)
            data = r.get("itinerary_data") or {}
            days_list = data.get("itinerary", [])
            r["total_places"] = sum(len(d.get("places", [])) for d in days_list)
            r["districts"] = list(set(d.get("district", "") for d in days_list if d.get("district")))
            results.append(r)

        return {"success": True, "count": len(results), "saved_itineraries": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
                SELECT
                    p.*,
                    g.itinerary_id, g.itinerary_data, g.generated_at,
                    g.total_estimated_cost
                FROM "User_Preferences" p
                LEFT JOIN generated_itineraries g ON g.preference_id = p.preference_id
                WHERE p.preference_id = :preference_id AND p.user_id = :user_id
            """),
            {"preference_id": preference_id, "user_id": current_user["user_id"]}
        ).fetchone()

        if not itinerary:
            raise HTTPException(status_code=404, detail="Itinerary not found.")

        return {"success": True, "itinerary": dict(itinerary._mapping)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
