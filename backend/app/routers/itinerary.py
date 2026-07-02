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


def _strip_time_budget(data):
    """Remove cost/internal fields from itinerary places and meals.
    Preserves start_time, duration, time_of_day for display."""
    if isinstance(data, dict):
        if "places" in data:
            data["places"] = [_strip_place_fields(p) for p in data["places"]]
        if "hotel" in data and isinstance(data["hotel"], dict):
            data["hotel"] = {k: v for k, v in data["hotel"].items() if k not in ("budget",)}
        return {k: _strip_time_budget(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_strip_time_budget(item) for item in data]
    return data


_STRIP_FIELDS = {"cost_estimate", "is_anchor_activity", "_is_transit_stop", "_transit_stop_district", "_is_return_stop", "_return_stop_district", "_is_fallback", "_fallback_reason", "_transit_duration"}


def _strip_place_fields(place):
    if not isinstance(place, dict):
        return place
    return {k: v for k, v in place.items() if k not in _STRIP_FIELDS}


# ──────────────────────────────────────────────
# NEW ROUTES: Create preference + Generate itinerary (multi-district)
# ──────────────────────────────────────────────

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

        # Determine destination district for hotel suggestion
        # Hotel is ALWAYS in the final destination district (corridor[-1]),
        # never in intermediate transit districts.
        if starting != ending and len(corridor) > 1:
            dest_district = corridor[-1]
        else:
            dest_district = corridor[0]

        # Fetch hotels for the DESTINATION district (not starting district)
        from app.logic.itinerary_engine import get_hotels
        hotels_raw = get_hotels(db, dest_district, hotel_budget)
        hotels = [
            {
                "hotel_id": h.hotel_id, "hotel_name": h.hotel_name,
                "district": h.district, "budget": float(h.budget),
                "review_score": float(h.review_score or 0),
            }
            for h in hotels_raw
        ]

        return {
            "preference_id": pref_id,
            "corridor": corridor,
            "destination_district": dest_district,
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
            db.execute(
                text("""
                    INSERT INTO selected_hotels (preference_id, hotel_id, day_number, is_user_selected)
                    VALUES (:pid, :hid, 1, true)
                """),
                {"pid": preference_id, "hid": starting_hotel_id},
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

        # Strip time/cost fields before sending to frontend
        cleaned = _strip_time_budget(result)
        return {
            "data": cleaned,
            "preference_id": preference_id,
            "corridor": corridor,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))