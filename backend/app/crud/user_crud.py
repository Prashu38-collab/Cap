from sqlalchemy.orm import Session
from sqlalchemy import text

# Get User By Email

def get_user_by_email(db: Session, email: str):

    row = db.execute(
        text("""
            SELECT
                user_id,
                name,
                email,
                phone_number,
                password,
                terms_accepted,
                confirm_password,
                is_verified,
                otp,
                otp_expiry,
                status
            FROM users
            WHERE email = :email
        """),
        {"email": email}
    ).fetchone()

    return row

# Get User By ID

def get_user_by_id(db: Session, user_id: int):

    row = db.execute(
        text("""
            SELECT
                user_id,
                name,
                email,
                phone_number,
                password,
                terms_accepted,
                confirm_password,
                is_verified,
                otp,
                otp_expiry,
                status
            FROM users
            WHERE user_id = :user_id
        """),
        {"user_id": user_id}
    ).fetchone()

    return row

# Get All Users

def get_all_users(db: Session):

    rows = db.execute(
        text("""
            SELECT
                user_id,
                name,
                email,
                phone_number,
                is_verified,
                status
            FROM users
            ORDER BY user_id ASC
        """)
    ).fetchall()

    return rows

# Create User

def create_user(
    db: Session,
    name: str,
    email: str,
    phone_number: str,
    hashed_password: str,
    terms_accepted: bool,
    confirm_password: str,
    otp: str = None,
    otp_expiry=None,
    is_verified: bool = False,
    status: str = "Inactive"
):

    db.execute(
        text("""
            INSERT INTO users
            (
                name,
                email,
                phone_number,
                password,
                terms_accepted,
                confirm_password,
                is_verified,
                otp,
                otp_expiry,
                status
            )

            VALUES
            (
                :name,
                :email,
                :phone_number,
                :password,
                :terms_accepted,
                :confirm_password,
                :is_verified,
                :otp,
                :otp_expiry,
                :status
            )
        """),
        {
            "name": name,
            "email": email,
            "phone_number": phone_number,
            "password": hashed_password,
            "terms_accepted": terms_accepted,
            "confirm_password": confirm_password,
            "is_verified": is_verified,
            "otp": otp,
            "otp_expiry": otp_expiry,
            "status": status
        }
    )

    db.commit()

# Verify User

def verify_user(db: Session, email: str):

    result = db.execute(
        text("""
            UPDATE users
            SET
                is_verified = TRUE,
                status = 'Active',
                otp = NULL,
                otp_expiry = NULL
            WHERE email = :email
        """),
        {
            "email": email
        }
    )

    db.commit()

    return result.rowcount > 0

# Update OTP

def update_otp(
    db: Session,
    email: str,
    otp: str,
    otp_expiry
):

    db.execute(
        text("""
            UPDATE users
            SET
                otp = :otp,
                otp_expiry = :otp_expiry
            WHERE email = :email
        """),
        {
            "email": email,
            "otp": otp,
            "otp_expiry": otp_expiry
        }
    )

    db.commit()

# Update User Status (Admin)

def update_user_status(
    db: Session,
    user_id: int,
    status: str
):

    result = db.execute(
        text("""
            UPDATE users
            SET status = :status
            WHERE user_id = :user_id
        """),
        {
            "status": status,
            "user_id": user_id
        }
    )

    db.commit()

    return result.rowcount > 0

# Delete User

def delete_user(
    db: Session,
    user_id: int
):

    result = db.execute(
        text("""
            DELETE FROM users
            WHERE user_id = :user_id
        """),
        {
            "user_id": user_id
        }
    )

    db.commit()

    return result.rowcount > 0