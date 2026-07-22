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
#  Trek timeline builder
# ──────────────────────────────────────────────

import re


def _parse_travel_hours(text: str) -> tuple:
    """Extract (hours: float, mode: str) from travel_time or activity text.

    Returns (0.0, "") when nothing parseable is found.
    """
    if not text:
        return 0.0, ""

    t = text.strip().lower()

    # Detect travel mode
    mode = ""
    if any(w in t for w in ("drive", "bus", "vehicle", "ride")):
        mode = "drive"
    elif any(w in t for w in ("trek", "hike", "climb", "ascend", "descend", "cross")):
        mode = "trek"
    elif "walk" in t:
        mode = "walk"
    elif "flight" in t or "fly" in t:
        mode = "fly"

    # Extract hour numbers (handle ranges like "7–8", "7-8", "6.5-7")
    nums = re.findall(r"(\d+(?:\.\d+)?)", t)
    hours = 0.0
    if len(nums) >= 2:
        hours = (float(nums[0]) + float(nums[1])) / 2.0
    elif len(nums) == 1:
        hours = float(nums[0])

    return hours, mode


def _advance_time(time_str: str, minutes: int) -> str:
    """Add *minutes* to a HH:MM time string, return new HH:MM."""
    h, m = map(int, time_str.split(":"))
    total = h * 60 + m + minutes
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"


def _build_day_timeline(
    stop_name: str,
    activity: str,
    travel_time: str,
    overnight: bool,
    day_number: int,
    total_days: int,
    prev_stop_name: str = "",
    is_travel_day: bool = False,
    is_trek_day: bool = False,
    is_return_day: bool = False,
) -> list:
    """Build a realistic daily timeline from trek_stops data.

    Uses trek_stops.travel_time and trek_stops.activity as the PRIMARY source.
    Only adds breakfast/lunch/dinner/check-in around the database values.
    Never invents generic activities.
    """
    is_first_trek_day = is_trek_day and day_number == 2
    is_last = is_return_day or day_number == total_days

    travel_hours, travel_mode = _parse_travel_hours(travel_time or activity)

    # ── Fallback defaults when no parseable travel time ──
    if travel_hours == 0:
        if travel_mode == "drive":
            travel_hours = 5.0
        elif travel_mode == "trek":
            travel_hours = 6.0
        else:
            travel_hours = 4.0

    def mode_label():
        if travel_mode == "drive":
            return "Drive"
        if travel_mode == "trek":
            return "Trek"
        if travel_mode == "walk":
            return "Walk"
        if travel_mode == "fly":
            return "Flight"
        return "Travel"

    def hours_range():
        lo = int(round(travel_hours))
        hi = lo + 1
        return f"{lo}\u2013{hi} hrs"

    # ── Compute key times from travel data ──
    if is_first_trek_day:
        departure_time = "07:00"
    else:
        departure_time = "07:00"

    travel_start = _advance_time(departure_time, 15)
    travel_end = _advance_time(travel_start, int(travel_hours * 60))

    if travel_hours >= 3:
        lunch_time = _advance_time(travel_start, int(travel_hours * 60 * 0.5))
    else:
        lunch_time = _advance_time(travel_end, 30)

    rest_time = _advance_time(travel_end, 60)

    # ── Build events from DATABASE values ──
    events = []

    # 1. Breakfast (always first)
    events.append({
        "time": "06:00",
        "label": "Breakfast",
        "type": "breakfast",
    })

    # 2. Departure
    if is_first_trek_day:
        depart_label = f"Depart from hotel"
    elif prev_stop_name:
        depart_label = f"Start trek from {prev_stop_name}"
    else:
        depart_label = "Start trek"

    events.append({
        "time": departure_time,
        "label": depart_label,
        "type": "departure",
    })

    # 3. Travel segment (uses trek_stops.travel_time directly)
    travel_label = f"{mode_label()} {hours_range()}"
    events.append({
        "time": travel_start,
        "label": travel_label,
        "type": "travel",
        "travel_mode": travel_mode,
        "travel_hours": round(travel_hours, 1),
    })

    # 4. Lunch (for long travel days)
    if travel_hours >= 3:
        events.append({
            "time": lunch_time,
            "label": "Lunch",
            "type": "lunch",
        })

    # 5. Arrival at stop
    arrival_label = f"Reach {stop_name}"
    events.append({
        "time": travel_end,
        "label": arrival_label,
        "type": "arrival",
    })

    # 6. Activity (uses trek_stops.activity directly — the PRIMARY source)
    if activity:
        act_lower = activity.lower().strip()
        # Only show activity if it's not already a drive/travel/trek keyword
        # (those are covered by the travel segment above)
        is_travel_activity = any(
            kw in act_lower
            for kw in ("drive", "bus", "vehicle", "ride", "flight", "fly")
        )
        if not is_travel_activity:
            events.append({
                "time": _advance_time(travel_end, 30),
                "label": activity,
                "type": "explore",
            })

    # 7. Hotel check-in (overnight stops)
    if overnight:
        events.append({
            "time": _advance_time(travel_end, 90),
            "label": "Hotel Check-in",
            "type": "check_in",
        })

    # 8. Dinner
    events.append({
        "time": "19:00" if travel_hours <= 4 else _advance_time(travel_end, 120),
        "label": "Dinner",
        "type": "dinner",
    })

    # 9. Overnight or rest
    if overnight:
        events.append({
            "time": "20:30",
            "label": "Overnight Stay",
            "type": "overnight",
        })
    elif is_last:
        events.append({
            "time": _advance_time("19:00", 60),
            "label": "Rest for the night",
            "type": "rest",
        })

    return events


# ──────────────────────────────────────────────
#  POST /itinerary/generate-trek
# ──────────────────────────────────────────────
@router.post("/itinerary/generate-trek")
def generate_trek(payload: dict, db: Session = Depends(get_db)):
    try:
        place_id = payload.get("place_id")
        travel_days = int(payload.get("travel_days", 1))
        starting_district = payload.get("starting_district", "")

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

        # ── Fetch starting district coordinates ──
        start_coords = None
        if starting_district:
            start_row = db.execute(
                text("""
                    SELECT AVG("Latitude") AS avg_lat, AVG("Longitude") AS avg_lon
                    FROM itinerary_places
                    WHERE "District" ILIKE :district
                """),
                {"district": f"%{starting_district}%"},
            ).fetchone()
            if start_row and start_row.avg_lat and start_row.avg_lon:
                start_coords = (float(start_row.avg_lat), float(start_row.avg_lon))

        # Fallback: use trek district coords if no starting district provided
        if not start_coords:
            trek_coords_row = db.execute(
                text("""
                    SELECT AVG("Latitude") AS avg_lat, AVG("Longitude") AS avg_lon
                    FROM itinerary_places
                    WHERE "District" ILIKE :district
                """),
                {"district": f"%{trek_info.District}%"},
            ).fetchone()
            if trek_coords_row and trek_coords_row.avg_lat and trek_coords_row.avg_lon:
                start_coords = (float(trek_coords_row.avg_lat), float(trek_coords_row.avg_lon))

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

        stops = stops[:travel_days]

        all_hotels = db.execute(
            text("""
                SELECT hotel_id, hotel_name, latitude, longitude,
                       budget, review_score, district
                FROM hotels
            """),
        ).fetchall()

        # ── Prepend travel day (Day 1) before trek days start ──
        # DB day_number is "day on trail", we shift all by +1 and add travel day
        days = []
        prev_stop = None

        # Travel day: journey from starting district to first trek stop
        first_stop = stops[0]
        starting_district_label = starting_district or trek_info.District or ""

        # Calculate travel distance and hours from starting coords to first stop
        travel_hours = 5.0  # default fallback
        travel_distance_km = 0.0
        if start_coords and first_stop.latitude and first_stop.longitude:
            try:
                from app.services.osrm_service import get_road_distance
                osrm_result = get_road_distance(
                    start_coords[0], start_coords[1],
                    float(first_stop.latitude), float(first_stop.longitude),
                )
                if osrm_result:
                    travel_distance_km = osrm_result["distance_km"]
                    travel_hours = max(1.0, osrm_result["duration_min"] / 60.0)
                else:
                    raise ValueError("OSRM returned None")
            except Exception:
                travel_distance_km = _haversine_km(
                    start_coords[0], start_coords[1],
                    float(first_stop.latitude), float(first_stop.longitude),
                )
                if travel_distance_km > 0:
                    travel_hours = max(1.0, travel_distance_km / 40.0)
                else:
                    travel_hours = 5.0

        travel_hours_lo = int(round(travel_hours))
        travel_hours_hi = travel_hours_lo + 1
        travel_time_label = f"{travel_hours_lo}\u2013{travel_hours_hi} hrs"
        travel_distance_label = f"{int(round(travel_distance_km))} km" if travel_distance_km > 0 else ""

        travel_day = {
            "day_number": 1,
            "stop_name": first_stop.stop_name,
            "latitude": float(first_stop.latitude) if first_stop.latitude else None,
            "longitude": float(first_stop.longitude) if first_stop.longitude else None,
            "activity": f"Drive to {first_stop.stop_name}",
            "travel_time": f"{travel_time_label} drive ({travel_distance_label})" if travel_distance_label else f"{travel_time_label} drive",
            "overnight": True,
            "is_travel_day": True,
            "is_trek_day": False,
            "is_return_day": False,
        }

        # Build travel day timeline with calculated times
        td_depart = "07:00"
        td_travel_start = _advance_time(td_depart, 15)
        td_travel_end = _advance_time(td_travel_start, int(travel_hours * 60))
        td_lunch = _advance_time(td_travel_start, int(travel_hours * 60 * 0.5)) if travel_hours >= 3 else _advance_time(td_travel_end, 30)
        td_hotel_checkin = _advance_time(td_travel_end, 60)

        travel_day_timeline = [
            {"time": "06:00", "label": "Breakfast", "type": "breakfast"},
            {"time": td_depart, "label": f"Depart from {starting_district_label}", "type": "departure"},
            {"time": td_travel_start, "label": f"Drive to {first_stop.stop_name} ({travel_time_label})", "type": "travel", "travel_mode": "drive", "travel_hours": round(travel_hours, 1)},
        ]
        if travel_hours >= 3:
            travel_day_timeline.append({"time": td_lunch, "label": "Lunch en route", "type": "lunch"})
        travel_day_timeline.extend([
            {"time": td_travel_end, "label": f"Arrive at {first_stop.stop_name}", "type": "arrival"},
            {"time": td_hotel_checkin, "label": "Hotel Check-in", "type": "check_in"},
            {"time": "19:00", "label": "Dinner", "type": "dinner"},
            {"time": "20:30", "label": "Overnight Stay", "type": "overnight"},
        ])
        travel_day["timeline"] = travel_day_timeline

        # Find hotel near first stop
        if first_stop.latitude and first_stop.longitude:
            nearby_travel = []
            for h in all_hotels:
                if h.latitude is None or h.longitude is None:
                    continue
                dist = _haversine_km(
                    float(first_stop.latitude), float(first_stop.longitude),
                    float(h.latitude), float(h.longitude),
                )
                if dist <= 5.0:
                    nearby_travel.append({
                        "hotel_id": h.hotel_id,
                        "hotel_name": h.hotel_name,
                        "budget": float(h.budget) if h.budget else 0,
                        "review_score": float(h.review_score) if h.review_score else 0,
                        "district": h.district,
                        "distance_km": round(dist, 2),
                        "latitude": float(h.latitude),
                        "longitude": float(h.longitude),
                    })
            nearby_travel.sort(key=lambda x: x["distance_km"])
            travel_day["nearby_hotels"] = nearby_travel[:3]

        days.append(travel_day)
        prev_stop = first_stop

        for stop in stops:
            shifted_day = stop.day_number + 1  # DB Day 1 → Display Day 2
            stop_activity = (stop.activity or "").lower()
            stop_name = (stop.stop_name or "").lower()
            stop_lat = float(stop.latitude) if stop.latitude else 0.0
            stop_lon = float(stop.longitude) if stop.longitude else 0.0
            is_actual_return = (
                stop_lat == 0.0 and stop_lon == 0.0
            ) or (
                "origin" in stop_name or "home" in stop_name
            ) or (
                "return" in stop_activity and ("origin" in stop_activity or "home" in stop_activity or "start" in stop_activity)
            )
            is_trek_day_flag = not is_actual_return

            day_data = {
                "day_number": shifted_day,
                "stop_name": stop.stop_name,
                "latitude": float(stop.latitude) if stop.latitude else None,
                "longitude": float(stop.longitude) if stop.longitude else None,
                "activity": stop.activity,
                "travel_time": stop.travel_time,
                "overnight": bool(stop.overnight),
                "is_travel_day": False,
                "is_trek_day": is_trek_day_flag,
                "is_return_day": is_actual_return,
            }

            day_data["timeline"] = _build_day_timeline(
                stop_name=stop.stop_name or "",
                activity=stop.activity or "",
                travel_time=stop.travel_time or "",
                overnight=bool(stop.overnight),
                day_number=shifted_day,
                total_days=len(stops) + 1,
                prev_stop_name=prev_stop.stop_name if prev_stop else "",
                is_travel_day=False,
                is_trek_day=is_trek_day_flag,
                is_return_day=is_actual_return,
            )

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
            prev_stop = stop

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
        is_nature_hard = (
            any(kw in cats_lower for kw in ["nature"])
            and mobility.lower() in ("difficult", "hard")
        )

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
                trek_duration_message = None
                if best:
                    trek_match = {
                        "place_id": best[0],
                        "place_name": best[1],
                        "trek_days": best[2],
                    }
                    if best[2] != travel_days:
                        trek_duration_message = (
                            f"The closest available trek is {best[2]} days. "
                            "Trek durations are fixed, so this itinerary may "
                            "be slightly longer than your requested duration."
                        )

                return {
                    "preference_id": pref_id,
                    "corridor": corridor,
                    "flow": "trek_selection",
                    "treks": treks,
                    "recommended_trek": trek_match,
                    "trek_duration_message": trek_duration_message,
                }
            else:
                return {
                    "preference_id": pref_id,
                    "corridor": corridor,
                    "flow": "no_trek_fallback",
                    "message": (
                        f"{ending} currently has no trekking or adventure routes. "
                        "It is well known for its culture, heritage and nature. "
                        "Would you like to continue with those experiences instead?"
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
            hotels = fetch_hotels(db, ending, None)

        # ── Adventure preference fallback ──
        cats_lower = categories.lower()
        user_wants_adventure = any(kw in cats_lower for kw in ["adventure", "trek"])
        district_has_treks = _has_adventure_places(db, ending)

        response = {
            "preference_id": pref_id,
            "corridor": corridor,
            "flow": "hotel_selection",
            "hotels": hotels,
        }

        if district_has_treks and not user_wants_adventure:
            adventure_places = _fetch_adventure_places(db, ending)
            if adventure_places:
                response["trek_available"] = True
                response["trek_redirect_message"] = (
                    f"{ending} has {len(adventure_places)} trek/adventure option(s). "
                    "Would you like to explore those instead?"
                )
                response["available_treks"] = adventure_places

        # ── Nature + Hard → suggest trek recommendation ──
        if is_nature_hard and district_has_treks:
            best_trek = _find_best_trek(db, ending, travel_days)
            if best_trek:
                trek_rec = {
                    "place_id": best_trek[0],
                    "place_name": best_trek[1],
                    "trek_days": best_trek[2],
                }
                rec_msg = (
                    f"{ending} offers trekking adventures. Since you selected "
                    "Hard difficulty, would you like to explore the available "
                    "trek instead?"
                )
                duration_note = None
                if best_trek[2] != travel_days:
                    duration_note = (
                        f"The closest available trek is {best_trek[2]} days. "
                        "Trek durations are fixed, so this itinerary may be "
                        "slightly longer than your requested duration."
                    )
                response["trek_recommendation"] = trek_rec
                response["trek_recommendation_message"] = rec_msg
                response["trek_duration_note"] = duration_note

        if insufficient:
            nearby = _get_nearby_districts(ending)
            nearby_info = []
            for nd in nearby:
                nd_count = _count_places(db, nd)
                if nd_count > 0:
                    nearby_info.append({"district": nd, "place_count": nd_count})

            total_with_nearby = num_places + sum(n["place_count"] for n in nearby_info)
            max_days_with_nearby = estimate_max_days(total_with_nearby, places or None)

            response["insufficient_places"] = True
            response["place_count"] = num_places
            response["max_sightseeing_days"] = max_days
            response["requested_days"] = travel_days
            response["message"] = (
                f"The selected district does not have enough attractions to "
                f"comfortably fill your {travel_days}-day trip. "
                f"{ending} has enough attractions for approximately {max_days} "
                f"sightseeing day(s)."
            )
            response["options"] = [
                {
                    "id": "nearby",
                    "title": "Explore Nearby Districts",
                    "description": (
                        f"Include nearby transit districts ({len(nearby_info)} available) "
                        f"to enrich your itinerary — up to {max_days_with_nearby} days."
                    ),
                },
                {
                    "id": "relaxed",
                    "title": "Relaxed Itinerary",
                    "description": (
                        f"Generate a {travel_days}-day relaxed itinerary with "
                        f"{num_places} attraction(s) followed by rest days at your "
                        "own pace."
                    ),
                },
                {
                    "id": "change_destination",
                    "title": "Change Destination",
                    "description": "Go back and choose a different destination.",
                },
            ]
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

        # ── Save user's hotel selection to selected_hotels table ──
        existing = db.execute(
            text("""
                SELECT id FROM selected_hotels
                WHERE preference_id = :pid AND is_user_selected = true
            """),
            {"pid": preference_id}
        ).fetchall()

        if existing:
            db.execute(
                text("DELETE FROM selected_hotels WHERE preference_id = :pid AND is_user_selected = true"),
                {"pid": preference_id}
            )

        db.execute(
            text("""
                INSERT INTO selected_hotels (preference_id, day_number, hotel_id, is_user_selected)
                VALUES (:pid, 1, :hid, true)
            """),
            {"pid": preference_id, "hid": starting_hotel_id}
        )
        db.commit()

        # ── Use the Master Engine for comprehensive itinerary ──
        from app.logic.itinerary_engine import generate_master_itinerary, get_preferences
        from app.logic.transit_corridors import compute_corridor

        pref_full = get_preferences(db, preference_id)
        start_d = getattr(pref_full, "starting_district", "") or ""
        end_d = getattr(pref_full, "ending_district", "") or start_d
        corridor = compute_corridor(start_d, end_d)

        # If transit districts are selected, extend the corridor to include them
        if include_transit and transit_districts:
            extended_corridor = list(corridor)
            for td in transit_districts:
                td_norm = td.strip().title()
                if td_norm not in extended_corridor:
                    try:
                        sub = compute_corridor(extended_corridor[-1], td_norm)
                        for s in sub[1:]:
                            if s not in extended_corridor:
                                extended_corridor.append(s)
                    except Exception:
                        extended_corridor.append(td_norm)
            corridor = extended_corridor

        result = generate_master_itinerary(db, preference_id, corridor_override=corridor)

        cats_lower = (pref.category or "").lower()
        user_wants_adventure = any(kw in cats_lower for kw in ["adventure", "trek"])
        if not user_wants_adventure:
            trek_hint = _fetch_adventure_places(db, end_d)
            if trek_hint:
                result["trek_available"] = True
                result["trek_redirect_message"] = (
                    f"{end_d} also has {len(trek_hint)} trek option(s) "
                    "if you'd prefer an adventure itinerary."
                )

        return {
            "status": "success",
            "preference_id": preference_id,
            "district": end_d,
            "data": result,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
