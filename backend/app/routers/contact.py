from fastapi import Request, APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.security.limiter import limiter

from app.database import get_db

from app.schemas.contact_schema import (
    ContactCreate,
    ContactResponse
)

from app.crud.contact_crud import (
    create_contact_message
)

router = APIRouter(
    prefix="/contact",
    tags=["Contact"]
)

@router.post("/", response_model=ContactResponse)
@limiter.limit("5/minute")
def send_message(
    request: Request,
    data: ContactCreate,
    db: Session = Depends(get_db)
):

    create_contact_message(
        db=db,
        name=data.name,
        email=data.email,
        phone=data.phone,
        subject=data.subject,
        message=data.message
    )

    return {
        "message": "Message sent successfully."
    }