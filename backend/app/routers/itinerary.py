import math
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.logic.generator import (
    generate_itinerary, estimate_max_days, allocate_places_balanced,
)
from app.logic.transit_corridors import DISTRICT_GRAPH
from sqlalchemy import text

router = APIRouter()


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def fetch_places(db: Session, district: str, categories: str = None):
    query = text("""
        SELECT place_id, place_name,
               "Latitude" as latitude,
               "Longitude" as longitude,
                place_name as name,
               "District" as district,
               "Category" as category,
               "Indoor_Outdoor" as indoor_outdoor,
               "Mobility" as mobility,
               "Budget_level" as budget_level,
               "Entry_Fee" as entry_fee,
               estimated_duration_value,
               estimated_duration_unit,
               is_trek
        FROM itinerary_places
        WHERE "District" ILIKE :district
        AND (is_trek = false OR is_trek IS NULL)
    """)
    result = db.execute(query, {"district": f"%{district}%"}).fetchall()
    return [dict(r._mapping) for r in result]


def fetch_hotels(db: Session, district: str, hotel_budget: float = None):
    if hotel_budget:
        result = db.execute(text("""
            SELECT hotel_id, hotel_name,
                   latitude, longitude,
                   district,
                   budget, review_score
            FROM hotels
            WHERE district ILIKE :district
            AND budget <= :budget
            ORDER BY review_score DESC
            LIMIT 10
        """), {"district": f"%{district}%", "budget": hotel_budget}).fetchall()

        if not result:
            result = db.execute(text("""
                SELECT hotel_id, hotel_name,
                       latitude, longitude,
                       district,
                       budget, review_score
                FROM hotels
                WHERE district ILIKE :district
                AND budget <= :budget
                ORDER BY review_score DESC
                LIMIT 10
            """), {"district": f"%{district}%", "budget": hotel_budget + 200}).fetchall()

        if not result:
            result = db.execute(text("""
                SELECT hotel_id, hotel_name,
                       latitude, longitude,
                       district,
                       budget, review_score
                FROM hotels
                WHERE district ILIKE :district
                ORDER BY budget ASC
                LIMIT 10
            """), {"district": f"%{district}%"}).fetchall()
    else:
        result = db.execute(text("""
            SELECT hotel_id, hotel_name,
                   latitude, longitude,
                   district,
                   budget, review_score
            FROM hotels
            WHERE district ILIKE :district
            ORDER BY review_score DESC
            LIMIT 10
        """), {"district": f"%{district}%"}).fetchall()

    return [dict(r._mapping) for r in result]


def _count_places(db: Session, district: str) -> int:
    """Count non-trek sightseeing places in a district."""
    result = db.execute(
        text("""
            SELECT COUNT(*) FROM itinerary_places
            WHERE "District" ILIKE :district
            AND (is_trek = false OR is_trek IS NULL)
        """),
        {"district": f"%{district}%"},
    ).scalar()
    return result or 0


def _has_adventure_places(db: Session, district: str) -> bool:
    """Check if the district contains any trek/adventure places."""
    result = db.execute(
        text("""
            SELECT 1 FROM itinerary_places
            WHERE is_trek = true
            AND "District" ILIKE :district
            LIMIT 1
        """),
        {"district": f"%{district}%"},
    ).fetchone()
    return result is not None


def _fetch_adventure_places(db: Session, district: str) -> List[dict]:
    """Return trek/adventure places in the district."""
    rows = db.execute(
        text("""
            SELECT place_id, place_name, "Latitude", "Longitude", "Category"
            FROM itinerary_places
            WHERE is_trek = true AND "District" ILIKE :district
            ORDER BY place_name
        """),
        {"district": f"%{district}%"},
    ).fetchall()
    return [
        {
            "place_id": r.place_id,
            "place_name": r.place_name,
            "latitude": float(r.Latitude) if r.Latitude else None,
            "longitude": float(r.Longitude) if r.Longitude else None,
            "category": r.Category,
        }
        for r in rows
    ]


def _get_nearby_districts(district: str) -> list:
    """Return adjacent districts from the transit corridor graph."""
    for key in DISTRICT_GRAPH:
        if key.lower() == district.lower().strip():
            return DISTRICT_GRAPH[key]
    # Fuzzy match
    for key in DISTRICT_GRAPH:
        if district.lower().strip() in key.lower() or key.lower() in district.lower().strip():
            return DISTRICT_GRAPH[key]
    return []


def _find_best_trek(db: Session, district: str, travel_days: int):
    """Find the trek whose duration most closely matches travel_days.

    Returns (place_id, place_name, trek_days) or None.
    """
    trek_rows = db.execute(
        text("""
            SELECT p.place_id, p.place_name,
                   COALESCE(MAX(s.day_number), 1) AS trek_days
            FROM itinerary_places p
            LEFT JOIN trek_stops s ON s.place_id = p.place_id
            WHERE p.is_trek = true
            AND p."District" ILIKE :district
            GROUP BY p.place_id, p.place_name
            ORDER BY ABS(COALESCE(MAX(s.day_number), 1) - :days) ASC
            LIMIT 1
        """),
        {"district": f"%{district}%", "days": travel_days},
    ).fetchone()

    if trek_rows:
        return trek_rows.place_id, trek_rows.place_name, trek_rows.trek_days
    return None


# ──────────────────────────────────────────────
#  GET /itinerary/get-trek-options
# ──────────────────────────────────────────────
@router.post("/itinerary/get-trek-options")
def get_trek_options(payload: dict, db: Session = Depends(get_db)):
    try:
        ending_district = payload.get("ending_district", "")
        if not ending_district:
            raise HTTPException(status_code=400, detail="ending_district is required")

        rows = db.execute(
            text("""
                SELECT place_id, place_name, "District", "Latitude", "Longitude",
                       "Category", "Indoor_Outdoor", "Mobility", "Budget_level",
                       "Entry_Fee", is_trek
                FROM itinerary_places
                WHERE is_trek = true AND "District" ILIKE :district
                ORDER BY place_name
            """),
            {"district": f"%{ending_district}%"},
        ).fetchall()

        treks = []
        for r in rows:
            treks.append({
                "place_id": r.place_id,
                "place_name": r.place_name,
                "district": r.District,
                "latitude": float(r.Latitude) if r.Latitude else None,
                "longitude": float(r.Longitude) if r.Longitude else None,
                "category": r.Category,
                "indoor_outdoor": r.Indoor_Outdoor,
                "mobility": r.Mobility,
                "budget_level": r.Budget_level,
                "entry_fee": r.Entry_Fee,
                "is_trek": r.is_trek,
            })

        return {"treks": treks, "count": len(treks)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
#  POST /itinerary/generate-trek
# ──────────────────────────────────────────────
@router.post("/itinerary/generate-trek")
def generate_trek(payload: dict, db: Session = Depends(get_db)):
    try:
        place_id = payload.get("place_id")
        travel_days = int(payload.get("travel_days", 1))

        if not place_id:
            raise HTTPException(status_code=400, detail="place_id is required")

        trek_info = db.execute(
            text("""
                SELECT place_name, "District" FROM itinerary_places
                WHERE place_id = :pid AND is_trek = true
            """),
            {"pid": place_id},
        ).fetchone()

        if not trek_info:
            raise HTTPException(status_code=404, detail="Trek not found")

        stops = db.execute(
            text("""
                SELECT stop_id, place_id, day_number, stop_name,
                       latitude, longitude, travel_time, overnight, activity
                FROM trek_stops
                WHERE place_id = :pid
                ORDER BY day_number ASC
            """),
            {"pid": place_id},
        ).fetchall()

        if not stops:
            raise HTTPException(status_code=404, detail="No trek stops found")

        stops = stops[:travel_days]

        all_hotels = db.execute(
            text("""
                SELECT hotel_id, hotel_name, latitude, longitude,
                       budget, review_score, district
                FROM hotels
            """),
        ).fetchall()

        days = []
        for stop in stops:
            day_data = {
                "day_number": stop.day_number,
                "stop_name": stop.stop_name,
                "latitude": float(stop.latitude) if stop.latitude else None,
                "longitude": float(stop.longitude) if stop.longitude else None,
                "activity": stop.activity,
                "travel_time": stop.travel_time,
                "overnight": bool(stop.overnight),
            }

            if stop.overnight:
                nearby = []
                for h in all_hotels:
                    if h.latitude is None or h.longitude is None:
                        continue
                    dist = _haversine_km(
                        float(stop.latitude), float(stop.longitude),
                        float(h.latitude), float(h.longitude),
                    )
                    if dist <= 5.0:
                        nearby.append({
                            "hotel_id": h.hotel_id,
                            "hotel_name": h.hotel_name,
                            "budget": float(h.budget) if h.budget else 0,
                            "review_score": float(h.review_score) if h.review_score else 0,
                            "district": h.district,
                            "distance_km": round(dist, 2),
                            "latitude": float(h.latitude),
                            "longitude": float(h.longitude),
                        })
                nearby.sort(key=lambda x: x["distance_km"])
                day_data["nearby_hotels"] = nearby[:3]

            days.append(day_data)

        return {
            "trek_name": trek_info.place_name,
            "district": trek_info.District,
            "total_days": len(days),
            "days": days,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
#  POST /itinerary/select-trek-hotel
# ──────────────────────────────────────────────
@router.post("/itinerary/select-trek-hotel")
def select_trek_hotel(payload: dict, db: Session = Depends(get_db)):
    try:
        preference_id = payload.get("preference_id")
        day_number = int(payload.get("day_number", 0))
        hotel_id = payload.get("hotel_id")

        if not preference_id:
            raise HTTPException(status_code=400, detail="preference_id is required")
        if day_number < 1:
            raise HTTPException(status_code=400, detail="day_number must be at least 1")
        if not hotel_id:
            raise HTTPException(status_code=400, detail="hotel_id is required")

        existing = db.execute(
            text("""
                SELECT id FROM trek_hotel_selections
                WHERE preference_id = :pid AND day_number = :dn
            """),
            {"pid": preference_id, "dn": day_number},
        ).fetchone()

        if existing:
            db.execute(
                text("""
                    UPDATE trek_hotel_selections
                    SET hotel_id = :hid WHERE id = :sid
                """),
                {"hid": hotel_id, "sid": existing.id},
            )
        else:
            db.execute(
                text("""
                    INSERT INTO trek_hotel_selections (preference_id, day_number, hotel_id)
                    VALUES (:pid, :dn, :hid)
                """),
                {"pid": preference_id, "dn": day_number, "hid": hotel_id},
            )

        db.commit()

        return {
            "message": "Hotel selection saved",
            "preference_id": preference_id,
            "day_number": day_number,
            "hotel_id": hotel_id,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
#  POST /itinerary/create-preference
# ──────────────────────────────────────────────
@router.post("/itinerary/create-preference")
def create_preference_route(payload: dict, db: Session = Depends(get_db)):
    try:
        from app.logic.transit_corridors import compute_corridor

        starting = payload.get("starting_district", "")
        ending = payload.get("ending_district", "") or starting
        travel_days = int(payload.get("travel_days", 1))
        travel_date = payload.get("travel_date", "")
        total_budget = int(payload.get("total_budget", 0))
        hotel_budget = int(payload.get("hotel_budget", 0))
        mobility = payload.get("mobility", "moderate")
        categories = payload.get("preferred_categories", "")
        user_id = int(payload.get("user_id", 1))

        # Save preferences
        row = db.execute(
            text("""
                INSERT INTO "User_Preferences"
                    (starting_district, ending_district, travel_days, travel_date,
                     total_budget, hotel_budget, mobility, category, user_id)
                VALUES (:start, :end, :days, :date, :tbudget, :hbudget, :mob, :cat, :uid)
                RETURNING preference_id
            """),
            {
                "start": starting, "end": ending, "days": travel_days,
                "date": travel_date, "tbudget": total_budget,
                "hbudget": hotel_budget, "mob": mobility,
                "cat": categories, "uid": user_id,
            }
        ).fetchone()
        db.commit()
        pref_id = row[0]

        corridor = compute_corridor(starting, ending)

        # ── Check if adventure/trek flow ──
        cats_lower = categories.lower()
        is_adventure = any(kw in cats_lower for kw in ["adventure", "trek"])

        if is_adventure and ending:
            trek_rows = db.execute(
                text("""
                    SELECT place_id, place_name, "Latitude", "Longitude", "Category"
                    FROM itinerary_places
                    WHERE is_trek = true AND "District" ILIKE :district
                    ORDER BY place_name
                """),
                {"district": f"%{ending}%"},
            ).fetchall()

            if trek_rows:
                # ── Pick best-matching trek for the requested travel days ──
                best = _find_best_trek(db, ending, travel_days)
                treks = []
                for r in trek_rows:
                    treks.append({
                        "place_id": r.place_id,
                        "place_name": r.place_name,
                        "latitude": float(r.Latitude) if r.Latitude else None,
                        "longitude": float(r.Longitude) if r.Longitude else None,
                        "category": r.Category,
                    })

                trek_match = None
                if best:
                    trek_match = {
                        "place_id": best[0],
                        "place_name": best[1],
                        "trek_days": best[2],
                    }

                return {
                    "preference_id": pref_id,
                    "corridor": corridor,
                    "flow": "trek_selection",
                    "treks": treks,
                    "recommended_trek": trek_match,
                }
            else:
                # ── District has NO trek ──
                return {
                    "preference_id": pref_id,
                    "corridor": corridor,
                    "flow": "no_trek_fallback",
                    "message": (
                        f"{ending} is better known for its culture, heritage and nature "
                        "than multi-day trekking. We can generate a sightseeing itinerary instead."
                    ),
                    "hotels": fetch_hotels(db, ending, hotel_budget),
                }

        # ── Normal sightseeing flow ──
        places = fetch_places(db, ending, categories)
        num_places = len(places)
        max_days = estimate_max_days(num_places, places=places if places else None)
        insufficient = travel_days > max_days and num_places > 0

        hotels = fetch_hotels(db, ending, hotel_budget)

        if not hotels:
            raise HTTPException(
                status_code=404,
                detail=f"No hotels found in {ending} within budget"
            )

        # ── Adventure preference fallback ──
        # User chose Adventure but district has no treks → suggest sightseeing
        cats_lower = categories.lower()
        user_wants_adventure = any(kw in cats_lower for kw in ["adventure", "trek"])
        district_has_treks = _has_adventure_places(db, ending)
        adventure_redirect_offered = False

        response = {
            "preference_id": pref_id,
            "corridor": corridor,
            "flow": "hotel_selection",
            "hotels": hotels,
        }

        # If user wanted adventure but no treks exist, inform them
        if user_wants_adventure and not district_has_treks:
            response["adventure_fallback"] = True
            response["adventure_fallback_message"] = (
                f"{ending} doesn't have multi-day trek options, "
                "but we've found great sightseeing attractions for your trip."
            )
        # If user didn't ask for adventure but treks exist, offer redirect
        elif district_has_treks and not user_wants_adventure:
            adventure_places = _fetch_adventure_places(db, ending)
            if adventure_places:
                response["trek_available"] = True
                response["trek_redirect_message"] = (
                    f"{ending} has {len(adventure_places)} trek/adventure option(s). "
                    "Would you like to explore those instead?"
                )
                response["available_treks"] = adventure_places

        if insufficient:
            nearby = _get_nearby_districts(ending)
            nearby_info = []
            for nd in nearby:
                nd_count = _count_places(db, nd)
                if nd_count > 0:
                    nearby_info.append({"district": nd, "place_count": nd_count})

            total_with_nearby = num_places + sum(n["place_count"] for n in nearby_info)
            max_days_with_nearby = estimate_max_days(total_with_nearby)

            response["insufficient_places"] = True
            response["place_count"] = num_places
            response["max_sightseeing_days"] = max_days
            response["requested_days"] = travel_days
            response["message"] = (
                f"{ending} has enough attractions for approximately {max_days} "
                f"sightseeing days. You selected {travel_days} days."
            )
            response["nearby_districts"] = nearby_info
            response["max_days_with_nearby"] = max_days_with_nearby

        return response

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
#  POST /itinerary/nearby-districts
# ──────────────────────────────────────────────
@router.post("/itinerary/nearby-districts")
def get_nearby_districts(payload: dict, db: Session = Depends(get_db)):
    """Fetch places from multiple districts (for transit expansion)."""
    try:
        districts = payload.get("districts", [])
        if not districts:
            raise HTTPException(status_code=400, detail="districts list is required")

        all_places = []
        district_counts = {}
        for d in districts:
            places = fetch_places(db, d)
            district_counts[d] = len(places)
            all_places.extend(places)

        return {
            "places": all_places,
            "total": len(all_places),
            "district_counts": district_counts,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
#  POST /itinerary/{preference_id}/generate
# ──────────────────────────────────────────────
@router.post("/itinerary/{preference_id}/generate")
def generate_from_hotel(
    preference_id: int,
    payload: dict,
    db: Session = Depends(get_db)
):
    try:
        starting_hotel_id = payload.get("starting_hotel_id")
        if not starting_hotel_id:
            raise HTTPException(
                status_code=400,
                detail="starting_hotel_id is required"
            )

        include_transit = payload.get("include_transit", False)
        transit_districts = payload.get("transit_districts", [])

        # Get preference details
        pref = db.execute(
            text("""
                SELECT starting_district, ending_district,
                       travel_days, hotel_budget, category, mobility
                FROM "User_Preferences"
                WHERE preference_id = :pid
            """),
            {"pid": preference_id}
        ).fetchone()

        if not pref:
            raise HTTPException(status_code=404, detail="Preference not found")

        ending = pref.ending_district or pref.starting_district
        travel_days = pref.travel_days or 3
        hotel_budget = pref.hotel_budget
        categories = pref.category or ""

        # Fetch places excluding treks
        places = fetch_places(db, ending, categories)

        # Fetch transit district places if requested
        extra_places = []
        if include_transit and transit_districts:
            for td in transit_districts:
                extra_places.extend(fetch_places(db, td))

        if not places and not extra_places:
            raise HTTPException(
                status_code=404,
                detail=f"No places found in {ending}"
            )

        # Fetch hotels (use ending district, or first transit district if no hotels)
        hotels = fetch_hotels(db, ending, hotel_budget)
        if not hotels and transit_districts:
            for td in transit_districts:
                hotels = fetch_hotels(db, td, hotel_budget)
                if hotels:
                    break

        if not hotels:
            raise HTTPException(
                status_code=404,
                detail=f"No hotels found in {ending} within budget"
            )

        # Generate itinerary using improved generator
        result = generate_itinerary(
            db=db,
            preference_id=preference_id,
            places=places,
            hotels=hotels,
            planning_mode="user_anchor",
            selected_hotel_id=starting_hotel_id,
            travel_days=travel_days,
            categories=categories,
            include_transit=include_transit,
            extra_places=extra_places or None,
            district=ending,
        )

        # ── Attach trek redirect hint when treks exist but user picked sightseeing ──
        cats_lower = categories.lower()
        user_wants_adventure = any(kw in cats_lower for kw in ["adventure", "trek"])
        if not user_wants_adventure:
            trek_hint = _fetch_adventure_places(db, ending)
            if trek_hint:
                result["trek_available"] = True
                result["trek_redirect_message"] = (
                    f"{ending} also has {len(trek_hint)} trek option(s) "
                    "if you'd prefer an adventure itinerary."
                )

        return {
            "status": "success",
            "preference_id": preference_id,
            "district": ending,
            "data": result,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
