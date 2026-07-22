from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ADMIN_EMAIL
)

security = HTTPBearer()

def verify_admin(
        
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    print("TOKEN RECEIVED:", repr(token))

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        email = payload.get("sub")
        role = payload.get("role")

        if not email:
            raise HTTPException(
                status_code=401,
                detail="Invalid token."
            )

        if email != ADMIN_EMAIL or role != "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin access only."
            )

        return payload

    except JWTError as e:
        print("JWT ERROR:", e)

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token."
        )