from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.logic.generator import generate_itinerary
from sqlalchemy import text

router = APIRouter()


# =====================================================
# GET PLACES + HOTELS (or assume already fetched)
# =====================================================
def fetch_places(db: Session, district: str):
    query = text("""
        SELECT place_id, name, latitide, longitude
        FROM places
        WHERE district = :district
    """)
    result = db.execute(query, {"district": district}).fetchall()

    return [dict(r._mapping) for r in result]


def fetch_hotels(db: Session, district: str):
    query = text("""
        SELECT hotel_id, hotel_name, latitude, longitude
        FROM hotels
        WHERE district = :district
    """)
    result = db.execute(query, {"district": district}).fetchall()

    return [dict(r._mapping) for r in result]


# =====================================================
# MAIN ENDPOINT
# =====================================================
@router.post("/generate-itinerary1")
def create_itinerary(payload: dict, db: Session = Depends(get_db)):

    try:
        preference_id = payload["preference_id"]
        district = payload["district"]
        planning_mode = payload["planning_mode"]
        selected_hotel_id = payload.get("selected_hotel_id")

        # ---------------------------------
        # STEP 1: FETCH DATA
        # ---------------------------------
        places = fetch_places(db, district)
        hotels = fetch_hotels(db, district)

        if not places:
            raise HTTPException(status_code=404, detail="No places found")

        if not hotels:
            raise HTTPException(status_code=404, detail="No hotels found")

        # ---------------------------------
        # STEP 2: CALL YOUR CORE ENGINE
        # ---------------------------------
        result = generate_itinerary(
            preference_id=preference_id,
            places=places,
            hotels=hotels,
            planning_mode=planning_mode,
            selected_hotel_id=selected_hotel_id,
            max_places_per_day=3
        )

        # ---------------------------------
        # STEP 3: RETURN RESPONSE
        # ---------------------------------
        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))