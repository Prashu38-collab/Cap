from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.logic.generator import generate_itinerary
from sqlalchemy import text

router = APIRouter()


# GET PLACES + HOTELS (or assume already fetched)
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


# MAIN ENDPOINT
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


# ====================================================================
# NEW ROUTES: Create preference + Generate itinerary (multi-district)
# ====================================================================

@router.post("/itinerary/create-preference")
def create_preference_route(payload: dict, db: Session = Depends(get_db)):
    """Create a user preference, compute corridor, and return available hotels."""
    try:
        from app.logic.transit_corridors import compute_corridor, _normalize

        starting = payload.get("starting_district", "")
        ending = payload.get("ending_district", "") or starting
        travel_days = int(payload.get("travel_days", 1))
        travel_date = payload.get("travel_date", "")
        total_budget = int(payload.get("total_budget", 0))
        hotel_budget = int(payload.get("hotel_budget", 0))
        mobility = payload.get("mobility", "moderate")
        categories = payload.get("preferred_categories", "")
        user_id = int(payload.get("user_id", 1))

        # Insert preference
        q = text("""
            INSERT INTO "User_Preferences"
                (starting_district, ending_district, travel_days, travel_date,
                 total_budget, hotel_budget, mobility, category, user_id)
            VALUES (:start, :end, :days, :date, :tbudget, :hbudget, :mobility, :cat, :uid)
            RETURNING preference_id
        """)
        row = db.execute(q, {
            "start": starting, "end": ending, "days": travel_days,
            "date": travel_date, "tbudget": total_budget, "hbudget": hotel_budget,
            "mobility": mobility, "cat": categories, "uid": user_id,
        }).fetchone()
        db.commit()
        pref_id = row[0]

        # Compute corridor
        corridor = compute_corridor(starting, ending)
        # All days allocated to ending district (intermediate districts are transit-only)
        districts_per_day = [corridor[-1]] * travel_days

        # Fetch hotels for ALL corridor districts (starting, intermediate, ending)
        from app.logic.itinerary_engine import get_hotels
        hotels = []
        for dist in sorted(set(corridor)):
            raw = get_hotels(db, dist, hotel_budget)
            for h in raw:
                hotels.append({
                    "hotel_id": h.hotel_id, "hotel_name": h.hotel_name,
                    "district": h.district, "budget": float(h.budget),
                    "review_score": float(h.review_score or 0),
                })

        return {
            "preference_id": pref_id,
            "corridor": corridor,
            "districts_per_day": districts_per_day,
            "hotels": hotels,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/itinerary/{preference_id}/generate")
def generate_from_hotel(preference_id: int, payload: dict, db: Session = Depends(get_db)):
    """Save the user's hotel selection and generate the full itinerary."""
    try:
        starting_hotel_id = payload.get("starting_hotel_id")
        if not starting_hotel_id:
            raise HTTPException(status_code=400, detail="starting_hotel_id is required")

        # Save hotel selection to selected_hotels table
        existing = db.execute(
            text("SELECT id FROM selected_hotels WHERE preference_id = :pid AND is_user_selected = true"),
            {"pid": preference_id},
        ).fetchone()
        if not existing:
            # id must match a valid hotel_id due to FK constraint on selected_hotels.id
            db.execute(
                text("""
                    INSERT INTO selected_hotels (id, preference_id, hotel_id, day_number, is_user_selected)
                    VALUES (:hid, :pid, :hid, 1, true)
                    ON CONFLICT (id) DO UPDATE SET preference_id = :pid2, hotel_id = :hid2, day_number = 1, is_user_selected = true
                """),
                {"hid": starting_hotel_id, "pid": preference_id, "pid2": preference_id, "hid2": starting_hotel_id},
            )
            db.commit()

        # Generate using the new multi-district engine
        from app.logic.itinerary_engine import build_itinerary
        result = build_itinerary(db, preference_id, starting_hotel_id=starting_hotel_id)

        # Get corridor for response
        pref = db.execute(
            text("""SELECT starting_district, ending_district FROM "User_Preferences" WHERE preference_id = :pid"""),
            {"pid": preference_id},
        ).fetchone()
        corridor = []
        if pref:
            from app.logic.transit_corridors import compute_corridor
            corridor = compute_corridor(pref.starting_district, pref.ending_district or pref.starting_district)

        return {
            "data": result,
            "preference_id": preference_id,
            "corridor": corridor,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))