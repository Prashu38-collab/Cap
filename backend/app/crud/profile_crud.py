from sqlalchemy.orm import Session
from sqlalchemy import text

# Get Profile
def get_profile(db: Session, email: str):

    return db.execute(
        text("""
            SELECT
                user_id,
                name,
                email,
                phone_number
            FROM users
            WHERE email=:email
        """),
        {"email": email}
    ).mappings().first()

# Update profile
def update_profile(
    db: Session,
    email: str,
    name: str,
    phone_number: str
):

    db.execute(
        text("""
            UPDATE users
            SET
                name=:name,
                phone_number=:phone_number
            WHERE email=:email
        """),
        {
            "name": name,
            "phone_number": phone_number,
            "email": email
        }
    )

    db.commit()

# Change password
def change_password(
    db: Session,
    email: str,
    hashed_password: str
):

    db.execute(
        text("""
            UPDATE users
            SET password=:password
            WHERE email=:email
        """),
        {
            "password": hashed_password,
            "email": email
        }
    )

    db.commit()