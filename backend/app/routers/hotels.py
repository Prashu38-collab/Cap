from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.logic.hotel_logic import (
    get_hotels_by_preference,
    save_trip_hotels
)

router = APIRouter(
    prefix="/preferences",
    tags=["Hotels"]
)


# =====================================================
# GET HOTELS
# =====================================================

@router.get("/{preference_id}/hotels")
def fetch_hotels(
    preference_id: int,
    db: Session = Depends(get_db)
):
    return get_hotels_by_preference(preference_id, db)


# =====================================================
# SAVE HOTEL (DAY-WISE VERSION)
# =====================================================

@router.post("/{preference_id}/hotel")
def choose_hotel(
    preference_id: int,
    selections: list,   # IMPORTANT: list of day-wise hotels
    db: Session = Depends(get_db)
):
    return save_trip_hotels(preference_id, selections, db)