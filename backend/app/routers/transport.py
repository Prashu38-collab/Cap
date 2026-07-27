from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.logic.transport_logic import TransportService

router = APIRouter(
    prefix="/transport",
    tags=["Transport"]
)


@router.get("/{preference_id}")
def get_transport(
    preference_id: int,
    db: Session = Depends(get_db)
):
    """
    Get transport options after itinerary generation.
    """

    return TransportService.get_transport(
        db,
        preference_id
    )