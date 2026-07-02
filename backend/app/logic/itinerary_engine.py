

# app/logic/itinerary_engine.py
import math
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException
from typing import List, Dict, Optional
from datetime import datetime, timedelta, time

from app.logic.recommendation_logic import RecommendationService
from app.logic.route_optimiser import (
    optimize_daily_route,
    calculate_total_distance,
    calculate_total_distance_osrm,
    distance_km,
    distance_km_elevation,
    get_place_elevation,
)
from app.logic.trek_routes import TREK_ROUTES
from app.logic.transit_corridors import (
    compute_corridor,
    allocate_days_to_districts,
    get_travel_fatigue_limits,
    _normalize,
)
from app.logic.route_corridors import (
    get_corridor as get_predefined_corridor,
    get_last_transit_district,
)
from app.logic.transit_recommender import (
    pick_transit_place,
    is_suitable_transit_place,
    get_transit_config,
    get_corridor_district_centroids,
)
from app.logic.category_relaxation import (
    get_relaxed_categories,
    categorize_place,
    score_with_relaxation,
)
from app.logic.fallback_recommender import (
    recommend_fallback_places,
    get_nearby_districts,
)
from app.logic.return_route import (
    should_suggest_return_stop,
    get_return_stop_district,
    estimate_return_timeline,
    get_return_config,
)

# ==============================
# PHASE 1: HELPER FUNCTIONS
# ==============================

def parse_time(time_str: Optional[str]) -> Optional[time]:
    """Safely parse a time string (HH:MM:SS or HH:MM) to a time object."""
    if not time_str:
        return None
    try:
        if isinstance(time_str, time):
            return time_str
        if ":" in str(time_str):
            parts = str(time_str).split(":")
            if len(parts) == 2:
                return time(int(parts[0]), int(parts[1]))
            elif len(parts) == 3:
                return time(int(parts[0]), int(parts[1]), int(parts[2]))
    except (ValueError, TypeError):
        pass
    return None


def time_add_hours(t: time, hours: float) -> time:
    """Add hours to a time object, returning a new time."""
    total_minutes = t.hour * 60 + t.minute + int(hours * 60)
    hours_out = (total_minutes // 60) % 24
    minutes_out = total_minutes % 60
    return time(hours_out, minutes_out)


def get_budget_quota(hotel_budget: int) -> int:
    """
    Budget Quota System: max 'Paid' places per day based on hotel_budget.
    Low:  budget < 3000  → max 1 paid place/day
    Medium: budget 3000-8000 → max 2 paid places/day
    High: budget > 8000 → no limit
    """
    if hotel_budget < 3000:
        return 1
    elif hotel_budget <= 8000:
        return 2
    else:
        return 999


def assign_transport_mode(dist_km: float) -> str:
    """
    Transport Mode Logic based on distance between consecutive points.
    < 3 km → Walk / Local Taxi
    3-50 km → Private Car / Local Bus
    50-150 km → Tourist Bus / Micro
    > 150 km → Flight / Long-distance Bus
    """
    if dist_km < 3:
        return "Walk / Local Taxi"
    elif dist_km <= 50:
        return "Private Car / Local Bus"
    elif dist_km <= 150:
        return "Tourist Bus / Micro"
    else:
        return "Flight / Long-distance Bus"


# Travel speed estimation for time budget
_TRAVEL_SPEEDS = {
    "walk": 5.0,
    "car": 30.0,
    "bus": 40.0,
    "long_distance": 50.0,
}

def estimate_travel_time(dist_km: float) -> float:
    """Estimate travel time in hours based on distance."""
    if dist_km < 3:
        speed = _TRAVEL_SPEEDS["walk"]
    elif dist_km <= 50:
        speed = _TRAVEL_SPEEDS["car"]
    elif dist_km <= 150:
        speed = _TRAVEL_SPEEDS["bus"]
    else:
        speed = _TRAVEL_SPEEDS["long_distance"]
    return dist_km / speed if speed > 0 else 0.5


def compute_transport_modes(
    start_lat: float, start_lon: float,
    places: List[Dict],
    start_elev: Optional[float] = None
) -> List[Dict]:
    """Add transport_mode to each place based on distance from previous point."""
    if not places:
        return []

    result = []
    curr_lat, curr_lon = start_lat, start_lon
    curr_elev = start_elev

    for place in places:
        p_lat = place.get('latitude')
        p_lon = place.get('longitude')
        p_elev = get_place_elevation(place)
        dist = distance_km_elevation(curr_lat, curr_lon, p_lat, p_lon, curr_elev, p_elev)
        mode = assign_transport_mode(dist)
        place_copy = dict(place)
        place_copy['transport_mode'] = mode
        place_copy['travel_dist_km'] = round(dist, 2)
        result.append(place_copy)
        curr_lat, curr_lon = p_lat, p_lon
        curr_elev = p_elev

    return result


# ==============================
# DISTRICT CENTROIDS + OSRM TRANSIT
# ==============================

DISTRICT_COORDS = {
    "Kathmandu": (27.7172, 85.3240),
    "Lalitpur": (27.6766, 85.3240),
    "Bhaktapur": (27.6722, 85.4278),
    "Kavrepalanchowk": (27.5408, 85.5855),
    "Nuwakot": (27.9213, 85.1673),
    "Rasuwa": (28.1600, 85.2833),
    "Sindhupalchowk": (27.7850, 85.6833),
    "Dolakha": (27.7300, 86.0833),
    "Chitwan": (27.5833, 84.5000),
    "Sindhuli": (27.2500, 85.9667),
}


def compute_transit_data(
    from_district: str, to_district: str
) -> dict:
    """Calculate transit info between two districts using OSRM with fallback.

    Returns:
        {"duration_hours": float, "distance_km": float,
         "transport_mode": str, "source": str}
    """
    fn = _normalize(from_district)
    tn = _normalize(to_district)
    if fn == tn:
        return {"duration_hours": 0, "distance_km": 0, "transport_mode": "Walk", "source": "same_district"}

    # Look up centroid coordinates
    fn_l = fn.lower()
    tn_l = tn.lower()
    coords_lower = {k.lower(): v for k, v in DISTRICT_COORDS.items()}
    c1 = coords_lower.get(fn_l)
    c2 = coords_lower.get(tn_l)

    if c1 and c2:
        try:
            from app.services.osrm_service import get_road_distance
            osrm_result = get_road_distance(c1[0], c1[1], c2[0], c2[1])
            if osrm_result:
                dur_h = round(osrm_result["duration_min"] / 60.0, 1)
                dist = osrm_result["distance_km"]
                mode = assign_transport_mode(dist)
                return {"duration_hours": dur_h, "distance_km": dist, "transport_mode": mode, "source": "osrm"}
        except Exception:
            pass

        # Fallback: elevation-aware Haversine
        from app.logic.route_optimiser import distance_km_elevation
        dist = distance_km_elevation(c1[0], c1[1], c2[0], c2[1], None, None)
        dur_h = round(dist / 30.0, 1)
        mode = assign_transport_mode(dist)
        return {"duration_hours": dur_h, "distance_km": round(dist, 2), "transport_mode": mode, "source": "haversine"}

    return {"duration_hours": 3.0, "distance_km": 100.0, "transport_mode": "Private Car / Local Bus", "source": "default"}


def build_transit_table(
    stay_districts: list,
    starting_district: str,
    full_corridor: Optional[list] = None,
) -> dict:
    """Build a lookup table of transit data for all needed routes.

    Returns dict keyed by (from_district_norm, to_district_norm).
    """
    table = {}
    # Departure: start → first stay
    if stay_districts and _normalize(starting_district) != _normalize(stay_districts[0]):
        key = (_normalize(starting_district), _normalize(stay_districts[0]))
        table[key] = compute_transit_data(starting_district, stay_districts[0])

    # Inter-stay transits
    for i in range(len(stay_districts) - 1):
        a, b = stay_districts[i], stay_districts[i + 1]
        if _normalize(a) != _normalize(b):
            key = (_normalize(a), _normalize(b))
            table[key] = compute_transit_data(a, b)

    # Return: last stay → start
    if stay_districts and _normalize(stay_districts[-1]) != _normalize(starting_district):
        key = (_normalize(stay_districts[-1]), _normalize(starting_district))
        table[key] = compute_transit_data(stay_districts[-1], starting_district)

    # Also compute transit data for all adjacent pairs in the full corridor
    # (needed for transit stopover sub-segments, e.g., KTM → Sindhupalchok)
    if full_corridor and len(full_corridor) > 2:
        for i in range(len(full_corridor) - 1):
            a, b = full_corridor[i], full_corridor[i + 1]
            key = (_normalize(a), _normalize(b))
            if key not in table:
                table[key] = compute_transit_data(a, b)

    return table


# Hotel area name detection (derives locality from hotel name)
AREA_KEYWORDS = {
    "sauraha": "Sauraha", "thamel": "Thamel",
    "baudha": "Baudha", "boudha": "Boudha",
    "patan": "Patan", "durbar": "Durbar Square",
    "lakeside": "Lakeside", "ratna park": "Ratna Park",
    "new road": "New Road", "koteshwor": "Koteshwor",
    "banasthali": "Banasthali", "kalimati": "Kalimati",
    "lalitpur": "Patan", "bhaktapur": "Bhaktapur Durbar Square",
}


def get_hotel_location(hotel_name: str, district: str) -> str:
    """Derive a human-readable location area from hotel name or district."""
    name_lower = hotel_name.lower()
    for keyword, label in AREA_KEYWORDS.items():
        if keyword in name_lower:
            return label
    return district


# ==============================
# 1. BULLETPROOF TREK MATCHER
# ==============================
def find_matching_trek(place_name: str):
    """Finds a trek by matching the place name, ignoring spaces and casing."""
    if not place_name:
        return None, None
        
    normalized_name = " ".join(place_name.lower().split())
    
    for trek_name, trek_data in TREK_ROUTES.items():
        normalized_trek = " ".join(trek_name.lower().split())
        if normalized_trek == normalized_name or normalized_trek in normalized_name or normalized_name in normalized_trek:
            return trek_name, trek_data
            
    return None, None

# ==============================
# 2. DB HELPERS
# ==============================
def get_preferences(db: Session, preference_id: int):
    q = text(""" SELECT * FROM "User_Preferences" WHERE preference_id = :pid """)
    pref = db.execute(q, {"pid": preference_id}).fetchone()
    if not pref: raise HTTPException(404, "Preference not found")
    return pref

def get_hotels(db: Session, district: str, budget: float):
    norm = _normalize(district)
    q = text(""" SELECT * FROM hotels WHERE district ILIKE :district AND budget <= :budget ORDER BY review_score DESC """)
    hotels = db.execute(q, {"district": f"%{norm}%", "budget": budget}).fetchall()
    if not hotels:
        # Try alternative spelling (without 'w' for chowk/chok variants)
        alt = norm.replace("chowk", "chok").replace("Chowk", "Chok")
        if alt != norm:
            hotels = db.execute(q, {"district": f"%{alt}%", "budget": budget}).fetchall()
    if not hotels:
        q_fallback = text(""" SELECT * FROM hotels WHERE district ILIKE :district ORDER BY review_score DESC """)
        hotels = db.execute(q_fallback, {"district": f"%{norm}%"}).fetchall()
    if not hotels and alt != norm:
        q_fallback = text(""" SELECT * FROM hotels WHERE district ILIKE :district ORDER BY review_score DESC """)
        hotels = db.execute(q_fallback, {"district": f"%{alt}%"}).fetchall()
    return hotels

def assign_hotels(hotels, days: int):
    if not hotels: raise HTTPException(404, "No hotels available in this district")
    assigned = []
    for day in range(1, days + 1):
        hotel = hotels[(day - 1) % len(hotels)]
        assigned.append({
            "day": day, "hotel_id": hotel.hotel_id, "hotel_name": hotel.hotel_name,
            "latitude": getattr(hotel, 'latitude', None), "longitude": getattr(hotel, 'longitude', None),
            "elevation_meters": getattr(hotel, 'elevation_meters', None)
        })
    return assigned


VALLEY_CLUSTER = {"kathmandu", "lalitpur", "bhaktapur"}

def _is_far_district_switch(prev_district: str, next_district: str) -> bool:
    """Returns True if switching between districts that are NOT all in the valley cluster.
    Valley cluster (KTM/Lalitpur/Bhaktapur) are close enough to share a hotel.
    Everything else is far and needs separate hotels."""
    pn = _normalize(prev_district).lower()
    nn = _normalize(next_district).lower()
    if pn == nn:
        return False
    both_in_valley = pn in VALLEY_CLUSTER and nn in VALLEY_CLUSTER
    return not both_in_valley


def get_hotel_plan(db: Session, preference_id: int, days: int, district_or_districts, budget: float):
    """
    Smart Hotel Selector: Reads from selected_hotels table.
    Handles 1 hotel for the whole trip, different hotels per day, and fallbacks.
    For far-district switches (outside KTM/Lalitpur/Bhaktapur valley), forces a new hotel.

    Args:
        district_or_districts: Either a single district string (legacy) or a
            list of district strings, one per day (multi-district).
    """
    # Determine per-day districts
    if isinstance(district_or_districts, list):
        day_districts = [district_or_districts[i] if i < len(district_or_districts) else district_or_districts[-1]
                         for i in range(days)]
    else:
        day_districts = [district_or_districts] * days

    # 1. Check for user-selected hotels
    q_selected = text("""
        SELECT day_number, hotel_id 
        FROM selected_hotels 
        WHERE preference_id = :pid AND is_user_selected = true
    """)
    selected_rows = db.execute(q_selected, {"pid": preference_id}).fetchall()
    
    hotel_plan = [None] * days

    if selected_rows:
        unique_hotels = set(row.hotel_id for row in selected_rows)

        # SCENARIO A: User selected ONE hotel for the whole trip
        if len(unique_hotels) == 1 and (selected_rows[0].day_number is None or selected_rows[0].day_number == 1):
            h_id = selected_rows[0].hotel_id
            q_hotel = text("SELECT * FROM hotels WHERE hotel_id = :hid")
            h = db.execute(q_hotel, {"hid": h_id}).fetchone()
            if h:
                for day in range(1, days + 1):
                    hotel_plan[day-1] = {
                        "day": day, "hotel_id": h.hotel_id, "hotel_name": h.hotel_name,
                        "latitude": getattr(h, 'latitude', None), "longitude": getattr(h, 'longitude', None),
                        "elevation_meters": getattr(h, 'elevation_meters', None)
                    }

        # SCENARIO B: User selected specific hotels for specific days
        else:
            selected_map = {row.day_number: row.hotel_id for row in selected_rows if row.day_number is not None}
            for day in range(1, days + 1):
                h_id = selected_map.get(day)
                if h_id:
                    q_hotel = text("SELECT * FROM hotels WHERE hotel_id = :hid")
                    h = db.execute(q_hotel, {"hid": h_id}).fetchone()
                    if h:
                        hotel_plan[day-1] = {
                            "day": day, "hotel_id": h.hotel_id, "hotel_name": h.hotel_name,
                            "latitude": getattr(h, 'latitude', None), "longitude": getattr(h, 'longitude', None),
                            "elevation_meters": getattr(h, 'elevation_meters', None)
                        }

    # SCENARIO C: Fill missing days with fallback hotels per district.
    # Reuse the same hotel for consecutive same-district days OR valley-cluster days.
    # Force a new hotel for far-district switches.
    # If no hotel exists in a far district, try neighboring districts before falling back.
    last_hotel_for_district = {}
    for i in range(days):
        if hotel_plan[i] is not None:
            continue
        district = _normalize(day_districts[i])

        # Check if we can reuse previous day's hotel
        if i > 0 and hotel_plan[i - 1] is not None:
            prev_district = _normalize(day_districts[i - 1])
            if not _is_far_district_switch(prev_district, district):
                reused = hotel_plan[i - 1]
                hotel_plan[i] = {
                    "day": i + 1, "hotel_id": reused["hotel_id"], "hotel_name": reused["hotel_name"],
                    "latitude": reused["latitude"], "longitude": reused["longitude"],
                    "elevation_meters": reused.get("elevation_meters"),
                }
                last_hotel_for_district[district] = hotel_plan[i]
                continue

        # Reuse hotel from previous same-district day if available (non-consecutive)
        if district in last_hotel_for_district:
            reused = last_hotel_for_district[district]
            hotel_plan[i] = {
                "day": i + 1, "hotel_id": reused["hotel_id"], "hotel_name": reused["hotel_name"],
                "latitude": reused["latitude"], "longitude": reused["longitude"],
                "elevation_meters": reused.get("elevation_meters"),
            }
            continue

        # Try normalized spelling, then alternative (chowk -> chok) if needed
        alt = district.replace("chowk", "chok").replace("Chowk", "Chok")

        def _find_hotels(d):
            q = text("""SELECT * FROM hotels WHERE district ILIKE :d AND budget <= :budget ORDER BY review_score DESC""")
            h = db.execute(q, {"d": f"%{d}%", "budget": budget}).fetchall()
            if not h:
                q2 = text("""SELECT * FROM hotels WHERE district ILIKE :d ORDER BY review_score DESC""")
                h = db.execute(q2, {"d": f"%{d}%"}).fetchall()
            return h

        fallback = _find_hotels(district)
        if not fallback and alt != district:
            fallback = _find_hotels(alt)

        if fallback:
            h = fallback[0]
            hotel_plan[i] = {
                "day": i + 1, "hotel_id": h.hotel_id, "hotel_name": h.hotel_name,
                "latitude": getattr(h, 'latitude', None), "longitude": getattr(h, 'longitude', None),
                "elevation_meters": getattr(h, 'elevation_meters', None)
            }
            last_hotel_for_district[district] = hotel_plan[i]
            continue

        # ─────────────────────────────────────────────────────────────────────
        # CRITICAL FIX: No hotels found in target district.
        # If this is a far-district switch, DO NOT silently reuse the previous
        # day's hotel (which is in a completely different district).
        # Instead, try neighboring districts, then error with a clear message.
        # ─────────────────────────────────────────────────────────────────────
        is_far_switch = (i > 0 and _is_far_district_switch(
            _normalize(day_districts[i - 1]), district
        ))

        if is_far_switch:
            # Try neighboring districts from the graph
            from app.logic.transit_corridors import DISTRICT_GRAPH
            neighbors = DISTRICT_GRAPH.get(district, [])
            neighbor_hotel = None
            neighbor_name = None
            for n in neighbors:
                nh = _find_hotels(n)
                if nh:
                    neighbor_hotel = nh[0]
                    neighbor_name = n
                    break

            if neighbor_hotel:
                h = neighbor_hotel
                hotel_plan[i] = {
                    "day": i + 1,
                    "hotel_id": h.hotel_id,
                    "hotel_name": h.hotel_name,
                    "latitude": getattr(h, 'latitude', None),
                    "longitude": getattr(h, 'longitude', None),
                    "elevation_meters": getattr(h, 'elevation_meters', None),
                    "note": f"Nearest hotel found in {neighbor_name} (no hotels available in {day_districts[i]})",
                }
                last_hotel_for_district[district] = hotel_plan[i]
                continue

            # No hotels in any neighbor either — raise a clear error
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No hotels available in {day_districts[i]} or any nearby district. "
                    "Cannot auto-assign a hotel for this destination. "
                    "Please add hotel data for this district or choose a different route."
                )
            )

        # Same district or valley cluster with no hotel data — reuse previous hotel
        if i > 0 and hotel_plan[i - 1] is not None:
            reused = hotel_plan[i - 1]
            hotel_plan[i] = {
                "day": i + 1, "hotel_id": reused["hotel_id"], "hotel_name": reused["hotel_name"],
                "latitude": reused["latitude"], "longitude": reused["longitude"],
                "elevation_meters": reused.get("elevation_meters"),
            }
            last_hotel_for_district[district] = hotel_plan[i]
            continue

        # Truly no option left
        raise HTTPException(
            status_code=404,
            detail=f"No hotels available for day {i + 1} in {day_districts[i]}."
        )

    # Final safety check
    missing = [i + 1 for i, h in enumerate(hotel_plan) if h is None]
    if missing:
        raise HTTPException(404, f"No hotels available for day(s): {missing}")

    return hotel_plan

# ──────────────────────────────────────────────
# MEAL INJECTION
# ──────────────────────────────────────────────
MEAL_TEMPLATES = {
    "breakfast": {"name": "Breakfast", "time_of_day": "morning", "start_time": "07:00", "duration_hours": 1.0, "type": "meal", "cost_estimate": 300, "icon": "🍳"},
    "lunch":     {"name": "Lunch",     "time_of_day": "afternoon", "start_time": "12:00", "duration_hours": 1.0, "type": "meal", "cost_estimate": 500, "icon": "🍛"},
    "dinner":    {"name": "Dinner",    "time_of_day": "evening",   "start_time": "19:00", "duration_hours": 1.0, "type": "meal", "cost_estimate": 650, "icon": "🍜"},
}

def _inject_meals(itinerary_days: list, districts_per_day: Optional[list] = None, starting_district: Optional[str] = None, transit_data: Optional[dict] = None) -> list:
    """Inject Breakfast/Lunch/Dinner segments at fixed times each day.
    Also adds 'Travel to [District]' segments when the district changes between days,
    and a 'Return to [Starting District]' segment on the last day."""

    def _meal_dict(key: str, district: str) -> dict:
        t = MEAL_TEMPLATES[key]
        return {
            "type": "meal", "name": t["name"],
            "time_of_day": t["time_of_day"], "start_time": t["start_time"],
            "duration": t["duration_hours"], "cost_estimate": t["cost_estimate"],
            "icon": t["icon"], "category": "meal",
            "indoor_outdoor": "indoor", "weather_sensitive": False,
            "transport_mode": "", "travel_dist_km": 0.0,
            "district": district, "is_anchor_activity": False,
        }

    def _lookup_transit(from_d: str, to_d: str) -> dict:
        """Look up transit data or compute a reasonable default."""
        if transit_data:
            key = (_normalize(from_d), _normalize(to_d))
            td = transit_data.get(key)
            if td:
                return td
        return {"duration_hours": 3.0, "distance_km": 100.0, "transport_mode": "Private Car / Local Bus", "source": "default"}

    def _transit_dict(district: str, prev_district: str) -> dict:
        td = _lookup_transit(prev_district, district)
        return {
            "type": "transit", "name": f"Travel from {prev_district} to {district}",
            "start_time": "06:00", "duration": td["duration_hours"],
            "icon": "🚌", "category": "transit",
            "indoor_outdoor": "outdoor", "weather_sensitive": False,
            "transport_mode": td.get("transport_mode", "Private Car / Local Bus"),
            "travel_dist_km": round(td.get("distance_km", 0), 2),
            "travel_time_hours": td["duration_hours"],
            "transit_source": td.get("source", "default"),
            "district": district, "is_anchor_activity": False,
            "time_of_day": "morning",
        }

    def _return_dict(start_district: str, from_district: str) -> dict:
        td = _lookup_transit(from_district, start_district)
        return {
            "type": "transit", "name": f"Return to {start_district}",
            "start_time": "17:00", "duration": td["duration_hours"],
            "icon": "🚌", "category": "transit",
            "indoor_outdoor": "outdoor", "weather_sensitive": False,
            "transport_mode": td.get("transport_mode", "Private Car / Local Bus"),
            "travel_dist_km": round(td.get("distance_km", 0), 2),
            "travel_time_hours": td["duration_hours"],
            "transit_source": td.get("source", "default"),
            "district": start_district, "is_anchor_activity": False,
            "time_of_day": "evening",
        }

    def _departure_dict(from_district: str, to_district: str) -> dict:
        td = _lookup_transit(from_district, to_district)
        return {
            "type": "transit", "name": f"Travel from {from_district} to {to_district}",
            "start_time": "06:00", "duration": td["duration_hours"],
            "icon": "🚌", "category": "transit",
            "indoor_outdoor": "outdoor", "weather_sensitive": False,
            "transport_mode": td.get("transport_mode", "Private Car / Local Bus"),
            "travel_dist_km": round(td.get("distance_km", 0), 2),
            "travel_time_hours": td["duration_hours"],
            "transit_source": td.get("source", "default"),
            "district": to_district, "is_anchor_activity": False,
            "time_of_day": "morning",
        }

    meal_keys = ["breakfast", "lunch", "dinner"]
    total_days = len(itinerary_days)

    for i, day in enumerate(itinerary_days):
        places = day.get("places", [])
        district = day.get("district", "")

        # Detect return day (last day, different from starting district)
        is_last_day = (i == total_days - 1)
        is_return_day = is_last_day and starting_district and _normalize(starting_district) != _normalize(district)

        # Build the full timeline: meals at fixed slots + places sorted by time
        if is_return_day:
            # Return day: breakfast + lunch only, skip dinner, add Trip Ends
            timeline = [_meal_dict(k, district) for k in ["breakfast", "lunch"]]
        else:
            timeline = [_meal_dict(k, district) for k in meal_keys]

        # On day 1, add departure from starting district if different from day's district
        if i == 0 and starting_district and districts_per_day:
            first_district = districts_per_day[0] if len(districts_per_day) > 0 else district
            if _normalize(starting_district) != _normalize(first_district):
                # Check if there's a transit stop place (from an intermediate district)
                transit_stop = next((p for p in places if p.get('_is_transit_stop')), None)
                stop_district = transit_stop.get('_transit_stop_district') if transit_stop else None
                if stop_district and _normalize(stop_district) != _normalize(first_district):
                    # Transit stopover: split the departure into two segments
                    seg1 = _departure_dict(starting_district, stop_district)
                    seg1['name'] = f"Travel from {starting_district} to {stop_district}"
                    seg1['start_time'] = "06:00"
                    timeline.insert(0, seg1)
                    # The stopover place is added to timeline with places loop
                    seg2 = _departure_dict(stop_district, first_district)
                    seg2['name'] = f"Travel from {stop_district} to {first_district}"
                    seg2['start_time'] = "13:00"
                    timeline.append(seg2)
                    # Override the stop place's start to a realistic transit-stop time
                    transit_stop['_start_time'] = "10:00"
                else:
                    departure = _departure_dict(starting_district, first_district)
                    timeline.insert(0, departure)

        # Check if district changed from previous day
        if i > 0 and districts_per_day:
            prev_district = districts_per_day[i - 1] if i - 1 < len(districts_per_day) else None
            curr_district = districts_per_day[i] if i < len(districts_per_day) else None
            if prev_district and curr_district and _normalize(prev_district) != _normalize(curr_district):
                transit = _transit_dict(curr_district, prev_district)
                timeline.insert(0, transit)

        # On the last day, add return to starting district if different
        if is_last_day and starting_district:
            start_norm = _normalize(starting_district)
            end_norm = _normalize(district)
            if start_norm != end_norm:
                # Check if there's a return stop place (from a transit district)
                return_stop = next((p for p in places if p.get('_is_return_stop')), None)
                if return_stop:
                    stop_district = return_stop.get('_return_stop_district', '')
                    if stop_district and _normalize(stop_district) != end_norm:
                        # Split return into two segments with stopover
                        seg1 = _return_dict(stop_district, district)
                        seg1['name'] = f"Travel from {district} to {stop_district}"
                        seg1['start_time'] = "13:00"
                        timeline.append(seg1)
                        # The stopover place is already in places with its _start_time
                        seg2 = _return_dict(starting_district, stop_district)
                        seg2['name'] = f"Travel from {stop_district} to {starting_district}"
                        seg2['start_time'] = "16:00"
                        timeline.append(seg2)
                    else:
                        ret = _return_dict(starting_district, district)
                        ret['name'] = f"Travel to {starting_district}"
                        timeline.append(ret)
                else:
                    ret = _return_dict(starting_district, district)
                    ret['name'] = f"Travel to {starting_district}"
                    timeline.append(ret)

                # Add Trip Ends as the very last entry on return day
                timeline.append({
                    "type": "end", "name": "Trip Ends",
                    "start_time": "20:00", "duration": 0,
                    "icon": "trip_end", "category": "end",
                    "indoor_outdoor": "indoor", "weather_sensitive": False,
                    "transport_mode": "", "travel_dist_km": 0.0,
                    "district": starting_district, "is_anchor_activity": False,
                    "time_of_day": "evening",
                })

        for p in places:
            timeline.append(p)

        def _sort_key(item):
            t = item.get("start_time") or item.get("_start_time", "09:00")
            h, m = t.split(":")
            return int(h) * 60 + int(m)

        timeline.sort(key=_sort_key)

        day["places"] = timeline

    return itinerary_days


# ==============================
# 3. MAIN ITINERARY BUILDER
# ==============================
def build_itinerary(db: Session, preference_id: int, corridor: Optional[list] = None, starting_hotel_id: Optional[int] = None):
    pref = get_preferences(db, preference_id)
    city = getattr(pref, "starting_district", "") or getattr(pref, "district", "")
    days = getattr(pref, "travel_days", 1)
    hotel_budget = getattr(pref, "hotel_budget", 100000)
    total_budget = getattr(pref, "total_budget", 100000)
    mobility = getattr(pref, "mobility", "moderate") or "moderate"
    travel_date = str(getattr(pref, "travel_date", ""))

    # ──────────────────────────────────────────────
    # Compute corridor + day-district allocation
    # ──────────────────────────────────────────────
    start = city
    end = getattr(pref, "ending_district", "") or start

    if corridor is None:
        # Prefer predefined corridor if one exists
        predefined = get_predefined_corridor(start, end)
        if predefined:
            corridor = predefined
        else:
            corridor = compute_corridor(start, end)

    # FIX: When start != end, the starting district is a DEPARTURE point,
    # not a stay point. The hotel is ALWAYS in the final destination
    # district (corridor[-1]), never in intermediate transit districts.
    if start != end and len(corridor) > 1:
        stay_districts = [corridor[-1]]  # Final destination only
    else:
        stay_districts = corridor      # Single-district trip

    day_district_pairs = allocate_days_to_districts(stay_districts, days)
    districts_per_day = [d for _, d in day_district_pairs]

    # ──────────────────────────────────────────────
    # Compute OSRM-based transit data for all routes
    # ──────────────────────────────────────────────
    transit_data = build_transit_table(stay_districts, start, full_corridor=corridor)

    # ──────────────────────────────────────────────
    # Fetch weather flags for place selection
    # ──────────────────────────────────────────────
    weather_by_day = {}
    if travel_date:
        try:
            from app.logic.weather_logic import WeatherService
            weather_flags = WeatherService.get_weather_flags_from_db(
                db, corridor[0], travel_date, days
            )
            for w in weather_flags:
                weather_by_day[w["day"]] = w
        except Exception:
            weather_by_day = {}

    # ──────────────────────────────────────────────
    # Budget validation using REAL hotel prices from DB
    # ──────────────────────────────────────────────
    min_hotel_per_district = {}
    for dist in set(districts_per_day):
        norm = _normalize(dist)
        alt = norm.replace("chowk", "chok").replace("Chowk", "Chok")
        min_price = db.execute(
            text("SELECT MIN(budget) FROM hotels WHERE district ILIKE :d"),
            {"d": f"%{norm}%"}
        ).scalar()
        if not min_price and alt != norm:
            min_price = db.execute(
                text("SELECT MIN(budget) FROM hotels WHERE district ILIKE :d"),
                {"d": f"%{alt}%"}
            ).scalar()
        min_hotel_per_district[dist] = min_price or 1000

    # Sum minimum hotel cost for each night based on actual day-district allocation
    actual_min_hotel = sum(min_hotel_per_district.get(d, 0) for d in districts_per_day)

    # Local transport buffer scaled by corridor length
    corridor_len = len(corridor)
    if corridor_len <= 1:
        per_day_transport = 200
    elif corridor_len == 2:
        per_day_transport = 300
    else:
        per_day_transport = 500
    min_local_transport = days * per_day_transport

    # Inter-district transport (tourist bus between districts)
    # Count district boundaries crossed in the corridor
    inter_district_boundaries = max(0, corridor_len - 1)
    per_boundary_cost = 1000  # NPR per district boundary (tourist bus)
    min_interdistrict_transport = inter_district_boundaries * per_boundary_cost

    min_transport_cost = min_local_transport + min_interdistrict_transport
    min_required = actual_min_hotel + min_transport_cost

    if total_budget < min_required:
        districts_detail = ", ".join(f"{d}={int(min_hotel_per_district.get(d, 0))}" for d in districts_per_day)
        raise HTTPException(
            status_code=400,
            detail=f"Total budget ({total_budget} NPR) too low. Minimum: {min_required} NPR (hotels: {int(actual_min_hotel)} NPR = {districts_detail} + local transport: {int(min_local_transport)} NPR + inter-district transport: {int(min_interdistrict_transport)} NPR)."
        )

    hotel_plan = get_hotel_plan(db, preference_id, days, districts_per_day, hotel_budget)

    rec_service = RecommendationService()
    ranked_places = rec_service.get_ranked_places(
        db, preference_id,
        districts_override=corridor,
    )
    if not ranked_places:
        cities_str = ", ".join(corridor)
        raise HTTPException(404, f"No places found for your preferences in {cities_str}")

    # 🔥 1. CHECK FOR STATIC TREK INJECTION
    top_place_name = ranked_places[0].get("place_name", "")
    trek_name, trek_data = find_matching_trek(top_place_name)

    if trek_name and trek_data:
        if trek_data['total_days'] > days:
             raise HTTPException(400, f"{trek_name} requires {trek_data['total_days']} days, but you selected {days} days.")

        # 🏔️ INJECT STATIC TREK ROUTE
        itinerary = []
        origin_district = city
        trek_place_id = ranked_places[0]['place_id'] 

        for stop in trek_data['stops']:
            day_num = stop['day']
            route_name = stop['route'].replace("Origin", origin_district)
            hotel_name = stop['hotel']
            
            if "Home" in hotel_name:
                hotel_name = f"Return to {origin_district}"

            itinerary.append({
                "day": day_num,
                "hotel": {
                    "day": day_num,
                    "hotel_name": hotel_name,
                    "latitude": stop['lat'],
                    "longitude": stop['lon'],
                    "note": "Accommodation included in trek package/route." if "Home" not in hotel_name else "End of trek."
                },
                "places": [{
                    "place_id": trek_place_id, 
                    "name": route_name,
                    "category": "adventure",
                    "duration": 8.0,
                    "is_anchor_activity": True,
                    "indoor_outdoor": "outdoor",
                    "weather_sensitive": True
                }],
                "total_travel_km": 0
            })

        return {
            "preference_id": preference_id,
            "days": days,
            "itinerary": itinerary,
            "used_place_ids": [trek_place_id],
            "trek_route_injected": trek_name
        }

    # 🔥 2. SKIP PLACES REQUIRING MORE DAYS THAN AVAILABLE
    valid_places = []
    for p in ranked_places:
        p_raw_val = float(p.get("raw_duration_value", 0))
        p_raw_unit = str(p.get("raw_duration_unit", "hours")).lower()
        p_is_trek = p.get("is_trek", False)

        if "day" in p_raw_unit or p_is_trek:
            p_days_req = max(1, int(p_raw_val))
            if p_days_req > days:
                continue
        valid_places.append(p)

    ranked_places = valid_places
    if not ranked_places:
        raise HTTPException(404, "No valid places found that fit within your travel days.")

    # 🔥 3. CATEGORIZE POOLS
    multi_day_pool, full_day_pool, standard_pool = [], [], []
    for p in ranked_places:
        duration_hours = float(p.get("duration_hours", 2.0))
        raw_val = p.get("raw_duration_value", 2.0)
        raw_unit = str(p.get("raw_duration_unit", "hours")).lower()
        is_trek = p.get("is_trek", False)

                # Multi-day (2+ days in 'day' unit) → multi_day_pool
        if "day" in raw_unit and raw_val >= 2:
            p['days_required'] = int(raw_val)
            multi_day_pool.append(p)

        # Full-day (1 day or 7+ hours) → full_day_pool
        elif "day" in raw_unit or duration_hours >= 7.0:
            p['days_required'] = 1
            full_day_pool.append(p)
        else:
            p['days_required'] = 1
            standard_pool.append(p)

    # Parse preferred categories before assigning anchors (used by both)
    raw_cats = getattr(pref, "category", None)
    preferred_categories = []
    if raw_cats:
        if isinstance(raw_cats, list): 
            preferred_categories = [c.lower() for c in raw_cats]
        else: 
            preferred_categories = [x.strip().lower() for x in str(raw_cats).split(",")]

    # 🔥 4. CREATE DAY SLOTS & ASSIGN ANCHORS
    day_slots = [{"day_num": i + 1, "places": [], "is_blocked": False} for i in range(days)]
    
    current_idx = 0
    for trek in multi_day_pool:
        req_days = trek['days_required']
        if current_idx + req_days <= days:
            for d in range(req_days):
                day_slots[current_idx + d]['is_blocked'] = True
                trek_copy = trek.copy()
                trek_copy['day_label'] = f" (Day {d+1} of {req_days})"
                day_slots[current_idx + d]['places'].append(trek_copy)
            current_idx += req_days

    # Assign Full-Day Activities — must match the day's district AND preferred categories
    for slot in day_slots:
        if slot['is_blocked'] or not full_day_pool:
            continue
        day_num = slot['day_num']
        slot_district = districts_per_day[day_num - 1] if day_num - 1 < len(districts_per_day) else corridor[-1]
        matched_idx = None
        if preferred_categories:
            for i, p in enumerate(full_day_pool):
                p_dist = _normalize(p.get("district") or "").lower()
                p_cat = (p.get("category") or "").lower()
                if p_dist == _normalize(slot_district).lower() and any(c in p_cat for c in preferred_categories):
                    matched_idx = i
                    break
        if matched_idx is not None:
            place = full_day_pool.pop(matched_idx)
            slot['is_blocked'] = True
            place['day_label'] = ""
            slot['places'].append(place)

    # Travel fatigue base limit (computed per-day inside the loop)
    # Single-category overrides adjust the base limit
    category_fatigue_overrides = {}
    if 'nature' in preferred_categories and len(preferred_categories) == 1:
        category_fatigue_overrides = {1: 2, 2: 2, 3: 1}
    elif 'adventure' in preferred_categories and len(preferred_categories) == 1:
        category_fatigue_overrides = {1: 1, 2: 1, 3: 1}

    
    # 🔥 5. FILL UNBLOCKED DAYS (GEOGRAPHIC GRAVITY v2 — Elevation + Time + Budget)
    MAX_HOURS_PER_DAY = 8.0
    used_place_ids = set()

    # Build corridor road polyline for transit scoring
    all_pool_places = multi_day_pool + full_day_pool + standard_pool
    corridor_points = get_corridor_district_centroids(corridor, all_pool_places)

    for slot in day_slots:
        if slot['is_blocked']:
            continue

        day_places = []
        current_day_hours = 0.0
        # Track current_time starting at 9:00 AM each day
        current_time = time(9, 0)
        daily_counts = {"nature": 0, "religious": 0, "cultural": 0, "adventure": 0}
        paid_count = 0

        current_hotel = hotel_plan[slot['day_num'] - 1]
        hotel_lat = current_hotel.get("latitude")
        hotel_lon = current_hotel.get("longitude")
        current_lat = hotel_lat
        current_lon = hotel_lon
        current_elev = get_place_elevation(current_hotel)

        budget_quota = get_budget_quota(int(getattr(pref, "hotel_budget", 5000)))

        day_num = slot['day_num']
        day_district = districts_per_day[day_num - 1] if day_num - 1 < len(districts_per_day) else corridor[-1]
        fatigue_max = get_travel_fatigue_limits(day_num, mobility)
        cat_override = category_fatigue_overrides.get(day_num)
        day_max_places = cat_override if cat_override is not None else fatigue_max

        # ────────────────────────────────────────────────────────────
        # PLACE CAPACITY RULES
        # First and last day: max 2 places (travel days)
        # Middle days:        max 4 places (full exploration days)
        # ────────────────────────────────────────────────────────────
        is_long_transit_day = (
            day_num == 1 and len(corridor) > 1
            and _is_far_district_switch(corridor[0], day_district)
        )
        is_long_return_day = (
            day_num == days and len(corridor) > 1
            and _is_far_district_switch(day_district, corridor[0])
        )

        if day_num == 1 or day_num == days:
            day_max_places = min(day_max_places, 2)

        # TRANSIT DAY RULE: Day 1 with inter-district travel gets max 1 sightseeing
        if day_num == 1 and len(corridor) > 1 and is_long_transit_day:
            day_max_places = min(day_max_places, 1)
        elif 1 < day_num < days:
            day_max_places = min(day_max_places, 4)

        # Keep long-transit detection for transit stopover logic below
        is_valley_trip = all(
            _normalize(d).lower() in VALLEY_CLUSTER for d in corridor
        ) if corridor else False

        # ────────────────────────────────────────────────────────────
        # TRANSIT STOPOVER: On long transit day 1, if there are
        # intermediate districts between the starting district and the
        # destination, suggest a place in the last intermediate district
        # as a stopover (e.g., visit Sindhupalchok on the way to Dolakha).
        # ────────────────────────────────────────────────────────────
        transit_stop_district = None
        if is_long_transit_day and day_num == 1 and corridor and len(corridor) > 2:
            start_norm = _normalize(corridor[0]).lower()
            target_norm = _normalize(day_district).lower()
            collecting = False
            for d in corridor:
                dn = _normalize(d).lower()
                if dn == start_norm:
                    collecting = True
                    continue
                if dn == target_norm:
                    break
                if collecting:
                    transit_stop_district = d

        # ────────────────────────────────────────────────────────────
        # PLACE POOL: Day 1/last day → corridor districts (en-route stops),
        # Middle days → destination district only
        # ────────────────────────────────────────────────────────────
        def _district_normalized(d: str) -> str:
            return _normalize(d or "").lower()

        start_norm = _district_normalized(corridor[0]) if corridor else ""

        if day_num == 1 and transit_stop_district:
            # Transit stopover: first place forced from intermediate district
            eligible_norm = {_district_normalized(transit_stop_district)}
        elif day_num == 1 or day_num == days:
            # First/last day: all corridor districts (except starting district)
            eligible_norm = {_district_normalized(d) for d in corridor[1:]} if corridor and len(corridor) > 1 else {_district_normalized(day_district)}
        else:
            # Middle days: destination district only
            eligible_norm = {_district_normalized(day_district)}

        day_standard_pool = [
            p for p in standard_pool
            if _district_normalized(p.get("district", "")) in eligible_norm
        ]

        # If the day's district has NO places, fall back to ALL remaining
        # places from the entire corridor (en-route transit districts).
        # This ensures every day has activity suggestions.
        is_fallback = False
        if not day_standard_pool and standard_pool:
            day_standard_pool = [
                p for p in standard_pool
                if _district_normalized(p.get("district", "")) != start_norm
            ]
            is_fallback = True

        # Weather check: on bad weather days, skip outdoor places
        day_weather = weather_by_day.get(day_num, {})
        is_bad_weather = day_weather.get("is_bad_weather", False)
        if is_bad_weather:
            day_standard_pool = [
                p for p in day_standard_pool
                if not (
                    str(p.get("weather_sensitivity", "No")).lower() == "yes"
                    and str(p.get("indoor_outdoor", "Outdoor")).lower() == "outdoor"
                )
            ]

        # ────────────────────────────────────────────────────────────
        # SMART TRANSIT STOPOVER: Pre-select transit place using
        # transit_recommender (respects detour, duration, trek rules).
        # Falls back to pure-distance scoring if no suitable place found.
        # ────────────────────────────────────────────────────────────
        if transit_stop_district and len(day_places) == 0:
            from_lat, from_lon = hotel_lat, hotel_lon
            dest_lat = day_standard_pool[0].get('latitude', hotel_lat) if day_standard_pool else hotel_lat
            dest_lon = day_standard_pool[0].get('longitude', hotel_lon) if day_standard_pool else hotel_lon

            # Determine transport mode for this transit segment
            transit_dist_km = distance_km(from_lat, from_lon, dest_lat, dest_lon) if from_lat and dest_lat else 100.0
            transit_mode = assign_transport_mode(transit_dist_km)

            transit_place = pick_transit_place(
                day_standard_pool,
                corridor[0] if corridor else "",
                day_district,
                (hotel_lat or 0, hotel_lon or 0),
                (dest_lat, dest_lon),
                transit_district=transit_stop_district,
                transport_mode=transit_mode,
                corridor_points=corridor_points,
                from_idx=0,
            )
            if transit_place:
                transit_place['_start_time'] = "10:00"
                transit_place['_time_of_day'] = "morning"
                transit_place['_is_transit_stop'] = True
                transit_place['_transit_stop_district'] = transit_stop_district
                dur = float(transit_place.get("duration_hours", 1.5))
                transit_place['_transit_duration'] = dur
                day_places.append(transit_place)
                current_day_hours += dur
                current_time = time_add_hours(time(10, 0), dur)
                # Advance time by 15 min buffer
                current_time = time_add_hours(current_time, 0.25)
                standard_pool.remove(transit_place)
                day_standard_pool = [p for p in day_standard_pool if p is not transit_place]

            # TRANSIT DAY RULE: After selecting the transit stop, enforce max 1
            # sightseeing place total on transit days (the transit stop IS that 1).
            # No additional destination-district places on the transit day.
            if transit_place:
                day_max_places = len(day_places)

        while len(day_places) < day_max_places and current_day_hours < MAX_HOURS_PER_DAY and day_standard_pool:
            best_next_place = None
            best_adjusted_score = -1.0
            candidate_pool = []

            for place in day_standard_pool:
                duration = float(place.get("duration_hours", 2.0))

                # --- Time-of-Day Constraint ---
                place_opening = parse_time(place.get("opening_time"))
                place_closing = parse_time(place.get("closing_time"))

                # Place hasn't opened yet → skip
                if place_opening and current_time < place_opening:
                    continue

                # Place closes before we'd finish → skip
                if place_closing and current_time >= place_closing:
                    continue

                finish_time = time_add_hours(current_time, duration)
                if place_closing and finish_time > place_closing:
                    continue

                # Time budget check
                if current_day_hours + duration > MAX_HOURS_PER_DAY:
                    continue

                # --- Category Pace Limits ---
                category_raw = (place.get("category") or "").lower()
                cat_key = "other"
                if "nature" in category_raw:
                    cat_key = "nature"
                elif "religious" in category_raw or "temple" in category_raw or "stupa" in category_raw:
                    cat_key = "religious"
                elif "cultural" in category_raw or "museum" in category_raw:
                    cat_key = "cultural"
                elif "adventure" in category_raw or "trek" in category_raw:
                    cat_key = "adventure"

                limits = {"nature": 2, "religious": 3, "cultural": 3, "adventure": 1}
                if cat_key in daily_counts and daily_counts[cat_key] >= limits.get(cat_key, 5):
                    continue

                # --- Budget Quota: count "Paid" places ---
                entry_fee = str(place.get("entry_fee", "free")).lower()
                is_paid = "paid" in entry_fee
                if is_paid and paid_count >= budget_quota:
                    continue

                # --- Elevation-Aware Score ---
                base_score = place.get("similarity_score", 0.5)

                # Apply category relaxation: preferred categories keep full score,
                # each relaxation level reduces the score progressively.
                # This ensures preferred places rank highest but other categories
                # remain eligible when preferred are exhausted.
                relaxed_score = score_with_relaxation(
                    place.get("category", ""),
                    base_score,
                    preferred_categories,
                )

                # --- Proximity Score: prefer places close to current position ---
                p_elev = get_place_elevation(place)
                dist_from_current = distance_km_elevation(
                    current_lat, current_lon,
                    place.get('latitude'), place.get('longitude'),
                    current_elev, p_elev
                )
                distance_penalty = (dist_from_current / 5.0) * 0.15

                # Long transit Day 1: pick the CLOSEST place to hotel using pure Haversine
                if is_long_transit_day and len(day_places) == 0:
                    haversine_dist = distance_km(
                        hotel_lat, hotel_lon,
                        place.get('latitude'), place.get('longitude')
                    )
                    adjusted_score = -haversine_dist
                elif is_fallback:
                    # Fallback mode: places from other districts may be far from
                    # hotel, so use relaxed_score only (no distance penalty) to
                    # ensure something gets selected
                    adjusted_score = relaxed_score
                else:
                    adjusted_score = relaxed_score - distance_penalty

                candidate_pool.append((adjusted_score, place, cat_key, duration, is_paid))

            if not candidate_pool:
                # Fallback: if no candidates from this district, try all remaining places
                if standard_pool:
                    day_standard_pool = [
                        p for p in standard_pool
                        if _district_normalized(p.get("district", "")) != start_norm
                    ]
                    is_fallback = True
                    continue
                break

            # Pick best candidate by adjusted score
            candidate_pool.sort(key=lambda x: x[0], reverse=True)
            best_score, best_place, best_cat, best_dur, best_paid = candidate_pool[0]

            # Don't break on negative scores for pure-distance Day 1
            # (where all scores are negative since distance > 0)
            if best_score <= 0 and not (is_long_transit_day and len(day_places) == 0):
                break

            # Store start time for timeline display
            place_start_str = f"{current_time.hour:02d}:{current_time.minute:02d}"
            best_place['_start_time'] = place_start_str
            time_of_day = "morning" if current_time.hour < 12 else "afternoon" if current_time.hour < 17 else "evening"
            best_place['_time_of_day'] = time_of_day

            day_places.append(best_place)
            current_day_hours += best_dur
            current_lat = best_place.get('latitude')
            current_lon = best_place.get('longitude')
            current_elev = get_place_elevation(best_place)

            # Mark transit stopover place so _inject_meals can split the transit
            # Only mark if smart transit recommender didn't already set it
            if transit_stop_district and not best_place.get('_is_transit_stop'):
                best_place['_is_transit_stop'] = True
                best_place['_transit_stop_district'] = transit_stop_district

            # Advance current_time with travel time between places
            # Compute distance from previous point to this place
            travel_from_lat = current_lat if current_lat is not None else hotel_lat
            travel_from_lon = current_lon if current_lon is not None else hotel_lon
            travel_dist = distance_km(
                travel_from_lat, travel_from_lon,
                best_place.get('latitude'), best_place.get('longitude')
            )
            travel_time = estimate_travel_time(travel_dist)
            best_place['_travel_dist_km'] = round(travel_dist, 2)
            best_place['_travel_time_hours'] = round(travel_time, 2)
            # Update current position
            current_lat = best_place.get('latitude')
            current_lon = best_place.get('longitude')
            current_elev = get_place_elevation(best_place)
            # Advance time: travel + visit + buffer
            current_time = time_add_hours(current_time, travel_time)
            end_time = time_add_hours(current_time, best_dur)
            current_time = time_add_hours(end_time, 0.25)
            current_day_hours += travel_time + best_dur

            if best_cat in daily_counts:
                daily_counts[best_cat] += 1
            if best_paid:
                paid_count += 1

            standard_pool.remove(best_place)
            day_standard_pool = [p for p in day_standard_pool if p is not best_place]

            # After selecting the transit stopover place, expand pool to
            # all corridor districts for remaining selections
            if transit_stop_district and len(day_places) == 1:
                expanded_norm = {_district_normalized(d) for d in corridor[1:]} if corridor and len(corridor) > 1 else {_district_normalized(day_district)}
                remaining_in_pool = [p for p in standard_pool if _district_normalized(p.get("district", "")) in expanded_norm]
                if remaining_in_pool:
                    day_standard_pool = remaining_in_pool

        # ────────────────────────────────────────────────────────────
        # RETURN TRANSIT (last day): Suggest one final attraction
        # on the return route if corridor has intermediate districts
        # AND the attraction is naturally on the return route.
        # Priority: destination sightseeing > checkout > lunch >
        #           transit attraction (only if naturally on route) >
        #           return to start > trip ends
        # ────────────────────────────────────────────────────────────
        if day_num == days and len(corridor) > 2 and len(day_places) < day_max_places:
            return_stop_district = get_return_stop_district(corridor)
            if return_stop_district and standard_pool:
                # Determine return transport mode
                return_dist_km = distance_km(hotel_lat, hotel_lon,
                    standard_pool[0].get('latitude', hotel_lat),
                    standard_pool[0].get('longitude', hotel_lon)) if hotel_lat and standard_pool else 100.0
                return_mode = assign_transport_mode(return_dist_km)

                return_candidates = []
                for p in standard_pool:
                    if p in day_places:
                        continue
                    if _district_normalized(p.get("district", "")) != _district_normalized(return_stop_district):
                        continue

                    # Use road-corridor constraint check (reversed direction)
                    suitable, reason = is_suitable_transit_place(
                        p, day_district, corridor[0],
                        (hotel_lat or 0, hotel_lon or 0),
                        (0, 0),
                        transport_mode=return_mode,
                        corridor_points=corridor_points,
                        from_idx=len(corridor_points) - 2 if len(corridor_points) >= 2 else 0,
                    )
                    if not suitable:
                        continue

                    score = score_transit_place(
                        p, (hotel_lat or 0, hotel_lon or 0),
                        (0, 0),
                        transport_mode=return_mode,
                        corridor_points=corridor_points,
                        from_idx=len(corridor_points) - 2 if len(corridor_points) >= 2 else 0,
                    )
                    return_candidates.append((score, p))

                if return_candidates:
                    return_candidates.sort(key=lambda x: x[0], reverse=True)
                    return_place = return_candidates[0][1]
                    return_place['_start_time'] = "15:00"
                    return_place['_time_of_day'] = "afternoon"
                    return_place['_is_return_stop'] = True
                    return_place['_return_stop_district'] = return_stop_district
                    day_places.append(return_place)
                    standard_pool.remove(return_place)
                    for pool_list in [day_standard_pool]:
                        if return_place in pool_list:
                            pool_list.remove(return_place)

        # ────────────────────────────────────────────────────────────
        # FALLBACK FILLING: If the day still has room and standard_pool
        # has remaining places, use fallback_recommender to fill gaps.
        # This ensures no day is left empty.
        # ────────────────────────────────────────────────────────────
        if len(day_places) < day_max_places and standard_pool:
            remaining_needed = day_max_places - len(day_places)
            additional = recommend_fallback_places(
                day_places,
                [p for p in standard_pool if p not in day_places and _district_normalized(p.get("district", "")) != start_norm],
                preferred_categories,
                daily_counts,
                day_max_places,
            )
            for p in additional:
                if len(day_places) >= day_max_places:
                    break
                if p.get('_is_fallback'):
                    p['_start_time'] = time_add_hours(current_time, 0).strftime("%H:%M") if current_time else "14:00"
                    p['_time_of_day'] = "afternoon"
                day_places.append(p)
                try:
                    standard_pool.remove(p)
                except ValueError:
                    pass

        slot['places'] = day_places

    # 🔥 6. ROUTE OPTIMIZE & FORMAT JSON (with Transport Mode)
    final_itinerary = []
    for slot in day_slots:
        day_idx = slot['day_num'] - 1
        day_district = districts_per_day[day_idx] if day_idx < len(districts_per_day) else corridor[-1]
        current_hotel = hotel_plan[day_idx]
        start_lat, start_lon = current_hotel.get("latitude"), current_hotel.get("longitude")
        start_elev = get_place_elevation(current_hotel)

        if slot['is_blocked']:
            formatted_places = [{
                "place_id": p["place_id"],
                "name": f"{p['place_name']}{p.get('day_label', '')}",
                "location": f"{p['place_name']}, {day_district}",
                "category": p["category"],
                "duration": p.get("duration_hours", 8.0),
                "is_anchor_activity": True,
                "indoor_outdoor": (p.get("indoor_outdoor") or "Outdoor").lower(),
                "weather_sensitive": str(p.get("weather_sensitivity", "No")).lower() == "yes",
                "transport_mode": "Walk (Trek)" if p.get("is_trek") else "Private Car / Local Bus",
                "travel_dist_km": 0.0,
                "latitude": p.get("latitude"),
                "longitude": p.get("longitude"),
                "start_time": "07:00",
                "time_of_day": "morning",
                "district": day_district,
                "_is_transit_stop": False,
                "_is_return_stop": False,
            } for p in slot['places']]
            travel_km = 0.0
        else:
            # Route optimize with elevation-aware distances
            optimized_places = optimize_daily_route(
                start_lat, start_lon, slot['places'], start_elev
            ) if start_lat and start_lon and slot['places'] else slot['places']

            # Assign transport modes between consecutive stops
            routed_with_transport = compute_transport_modes(
                start_lat, start_lon, optimized_places, start_elev
            )

            formatted_places = [{
                "place_id": p["place_id"],
                "name": p["place_name"],
                "location": f"{p['place_name']}, {day_district}",
                "category": p["category"],
                "duration": p.get("duration_hours", 2.0),
                "is_anchor_activity": False,
                "indoor_outdoor": (p.get("indoor_outdoor") or "Outdoor").lower(),
                "weather_sensitive": str(p.get("weather_sensitivity", "No")).lower() == "yes",
                "transport_mode": p.get("transport_mode", "Private Car / Local Bus"),
                "travel_dist_km": p.get("travel_dist_km", 0.0),
                "travel_time_hours": p.get("_travel_time_hours", 0.0),
                "latitude": p.get("latitude"),
                "longitude": p.get("longitude"),
                "start_time": p.get("_start_time", "09:00"),
                "time_of_day": p.get("_time_of_day", "morning"),
                "district": day_district,
                "_is_transit_stop": p.get("_is_transit_stop", False),
                "_transit_stop_district": p.get("_transit_stop_district"),
                "_is_return_stop": p.get("_is_return_stop", False),
                "_return_stop_district": p.get("_return_stop_district"),
            } for p in routed_with_transport]

            osrm_result = calculate_total_distance_osrm(
                start_lat, start_lon, optimized_places,
                return_to_hotel=True, start_elev=start_elev
            ) if optimized_places else {"total_km": 0.0, "total_duration_min": 0.0, "segments": [], "source": "none"}
            travel_km = osrm_result["total_km"]

            # Update transport modes with OSRM data if available
            if osrm_result["source"] == "osrm" and osrm_result["segments"]:
                for i, seg in enumerate(osrm_result["segments"]):
                    if i < len(routed_with_transport):
                        routed_with_transport[i]["travel_dist_km"] = seg["distance_km"]
                        routed_with_transport[i]["travel_duration_min"] = seg["duration_min"]
                        routed_with_transport[i]["route_source"] = seg["source"]

        for p in formatted_places:
            used_place_ids.add(p["place_id"])

        day_idx = slot['day_num'] - 1
        day_district = districts_per_day[day_idx] if day_idx < len(districts_per_day) else corridor[-1]

        # Build day title: "Kathmandu → Lalitpur" style
        prev_d = districts_per_day[day_idx - 1] if day_idx > 0 else corridor[0]
        day_title = f"{prev_d} → {day_district}" if day_idx > 0 and prev_d != day_district else day_district

        # Determine day_type for better organization
        day_num = slot['day_num']
        is_last = (day_num == days)
        is_first = (day_num == 1)
        needs_return = is_last and _normalize(day_district) != _normalize(city) and len(corridor) > 1
        is_transit_day = day_idx > 0 and _normalize(districts_per_day[day_idx - 1]) != _normalize(day_district)
        if is_first and _normalize(city) != _normalize(day_district) and len(corridor) > 1:
            day_type = "departure"
        elif needs_return:
            day_type = "return"
        elif is_transit_day:
            day_type = "transit"
        else:
            day_type = "exploration"

        # Group places by time_of_day
        time_slots = {"morning": [], "afternoon": [], "evening": []}
        for p in formatted_places:
            tod = p.get("time_of_day", "morning")
            if tod not in time_slots:
                tod = "morning"
            time_slots[tod].append(p)

        # Hotel location area
        hotel_location = get_hotel_location(current_hotel.get("hotel_name", ""), day_district)

        final_itinerary.append({
            "day": day_num,
            "day_type": day_type,
            "district": day_district,
            "day_title": day_title,
            "hotel": {
                "day": current_hotel["day"],
                "hotel_id": current_hotel["hotel_id"],
                "hotel_name": current_hotel["hotel_name"],
                "location_area": hotel_location,
                "district": day_district,
            },
            "places": formatted_places,
            "time_slots": time_slots,
            "total_travel_km": round(travel_km, 2),
        })

    # Inject meal segments and transit segments into each day's timeline
    final_itinerary = _inject_meals(final_itinerary, districts_per_day=districts_per_day, starting_district=city, transit_data=transit_data)

    return {
        "preference_id": preference_id, "days": days,
        "itinerary": final_itinerary, "used_place_ids": list(used_place_ids),
    }