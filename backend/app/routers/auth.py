from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

router = APIRouter(
    tags=["Authentication"]
)

# -----------------------------
# Password Hashing Setup
# -----------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# -----------------------------
# JWT CONFIG
# -----------------------------
SECRET_KEY = "mysecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# -----------------------------
# Temporary User Database
# -----------------------------
users_db = []

# -----------------------------
# Signup Model
# -----------------------------
class SignupModel(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    password: str
    confirm_password: str
    terms_accepted: bool

# -----------------------------
# Login Model
# -----------------------------
class LoginModel(BaseModel):
    email: EmailStr
    password: str

# -----------------------------
# Helpers
# -----------------------------
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return token

# -----------------------------
# REGISTER API
# -----------------------------
@router.post("/register")
def register(user: SignupModel):

    try:
        # Terms check
        if not user.terms_accepted:
            raise HTTPException(
                status_code=400,
                detail="You must accept Terms & Policy"
            )

        # Password match check
        if user.password != user.confirm_password:
            raise HTTPException(
                status_code=400,
                detail="Passwords do not match"
            )

        # Duplicate email check
        for u in users_db:
            if u["email"] == user.email:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered"
                )

        # Hash password
        hashed_pw = hash_password(user.password)

        # Store user
        users_db.append({
            "name": user.name,
            "email": user.email,
            "phone_number": user.phone_number,
            "password": hashed_pw
        })

        return {
            "message": "User registered successfully",
            "user": {
                "name": user.name,
                "email": user.email
            }
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------
# LOGIN API (WITH JWT)
# -----------------------------
@router.post("/login")
def login(user: LoginModel):

    try:
        # Step 1: Find user
        db_user = None

        for u in users_db:
            if u["email"] == user.email:
                db_user = u
                break

        # Email check
        if not db_user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # Password check
        is_valid_password = verify_password(
            user.password,
            db_user["password"]
        )

        if not is_valid_password:
            raise HTTPException(
                status_code=401,
                detail="Wrong password"
            )

        # Create JWT token
        token = create_access_token(
            data={"sub": db_user["email"]}
        )

        return {
            "message": "Login successful",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "name": db_user["name"],
                "email": db_user["email"]
            }
        }

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))