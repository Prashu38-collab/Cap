

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


def _allocate_days_to_corridor(corridor: list, days: int) -> list:
    """Allocate travel days to corridor districts with smart distribution.

    Rules:
      - 1 district  → all days there
      - 2 districts → split roughly evenly, extra goes to destination
      - 3+ districts → first district gets floor(days/3)+1, intermediates share, last gets remainder
    Always returns a list of district names, length == days.
    """
    n = len(corridor)
    if n == 0:
        return []
    if n == 1:
        return [corridor[0]] * days
    if days == 1:
        return [corridor[0]]

    # Two districts: first gets at least 1 day, destination gets rest
    if n == 2:
        first_days = max(1, days // 3)
        last_days = days - first_days
        return [corridor[0]] * first_days + [corridor[1]] * last_days

    # Three+ districts: distribute proportionally, minimum 1 day each for start/end
    first_days = max(1, min(days // 3, days - n + 1))
    remaining_days = days - first_days
    middle_districts = corridor[1:-1]
    middle_count = len(middle_districts)
    # Give intermediate districts 1 day each, remainder goes to destination
    middle_days_each = 1 if remaining_days >= middle_count + 1 else 0
    middle_total = middle_count * middle_days_each
    dest_days = remaining_days - middle_total

    allocation = [corridor[0]] * first_days
    for md in middle_districts:
        if middle_days_each > 0:
            allocation.append(md)
    allocation.extend([corridor[-1]] * dest_days)
    return allocation

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
    alt = norm.replace("chowk", "chok").replace("Chowk", "Chok")
    q = text(""" SELECT * FROM hotels WHERE district ILIKE :district AND budget <= :budget ORDER BY review_score DESC """)
    hotels = db.execute(q, {"district": f"%{norm}%", "budget": budget}).fetchall()
    if not hotels and alt != norm:
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


VALLEY_CLUSTER = {"Kathmandu", "Lalitpur", "Bhaktapur"}

MAX_PLACES_PER_DAY = 3

def _get_district_coords(district: str, db: Session) -> tuple:
    """Get (lat, lon) for the first available hotel in a district."""
    norm = _normalize(district)
    alt = norm.replace("chowk", "chok").replace("Chowk", "Chok")
    q = text("""SELECT latitude, longitude FROM hotels WHERE district ILIKE :d LIMIT 1""")
    dest = db.execute(q, {"d": f"%{norm}%"}).fetchone()
    if not dest and alt != norm:
        dest = db.execute(q, {"d": f"%{alt}%"}).fetchone()
    if dest and dest.latitude and dest.longitude:
        return (float(dest.latitude), float(dest.longitude))
    return None


def _needs_new_hotel(
    prev_lat: float, prev_lon: float,
    curr_district: str, db: Session, budget: float
) -> bool:
    """Returns True if a new hotel is needed because travel time > 90 minutes.
    Uses OSRM road distance with Haversine fallback (assumes 30 km/h on mountain roads).
    Prevents reusing hotel across distant districts (e.g. Kathmandu vs Chitwan)."""
    norm = _normalize(curr_district)

    # 1. Fetch the previous hotel's district from database using coordinates
    prev_hotel_district = ""
    try:
        prev_district_row = db.execute(
            text("""
                SELECT district FROM hotels
                WHERE ABS(latitude - :plat) < 0.0001 AND ABS(longitude - :plon) < 0.0001
                LIMIT 1
            """),
            {"plat": prev_lat, "plon": prev_lon}
        ).fetchone()
        if prev_district_row:
            prev_hotel_district = _normalize(prev_district_row[0])
    except Exception:
        pass

    # 2. If same district, we do not need a new hotel
    if norm == prev_hotel_district:
        return False

    # 3. Valley cluster rule: Kathmandu, Lalitpur, Bhaktapur are in the same cluster and can reuse hotel
    if norm in VALLEY_CLUSTER and prev_hotel_district in VALLEY_CLUSTER:
        return False

    # 4. Outside Kathmandu Valley or crossing valley boundary:
    # Hotel MUST change automatically to a hotel in the new district where overnight stay occurs.
    return True



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

    # Get user hotel coordinates for distance checking
    user_hotel_coords = None
    user_hotel_obj = None
    if selected_rows:
        h_id_first = selected_rows[0].hotel_id
        q_hotel_full = text("SELECT * FROM hotels WHERE hotel_id = :hid")
        user_hotel_obj = db.execute(q_hotel_full, {"hid": h_id_first}).fetchone()
        if user_hotel_obj:
            user_hotel_coords = (
                float(user_hotel_obj.latitude) if user_hotel_obj.latitude else None,
                float(user_hotel_obj.longitude) if user_hotel_obj.longitude else None,
            )

    if selected_rows:
        unique_hotels = set(row.hotel_id for row in selected_rows)

        # SCENARIO A: User selected ONE hotel for the whole trip
        if len(unique_hotels) == 1 and (selected_rows[0].day_number is None or selected_rows[0].day_number == 1):
            if user_hotel_obj:
                for day in range(1, days + 1):
                    day_dist_norm = _normalize(day_districts[day - 1])
                    # Day 1: use user hotel only if its district matches Day 1's district
                    if day == 1:
                        user_hotel_dist = _normalize(getattr(user_hotel_obj, 'district', '') or '')
                        day1_dist = _normalize(day_districts[0]) if day_districts else ''
                        if not user_hotel_dist or user_hotel_dist == day1_dist:
                            hotel_plan[day-1] = {
                                "day": day, "hotel_id": user_hotel_obj.hotel_id, "hotel_name": user_hotel_obj.hotel_name,
                                "latitude": getattr(user_hotel_obj, 'latitude', None), "longitude": getattr(user_hotel_obj, 'longitude', None),
                                "elevation_meters": getattr(user_hotel_obj, 'elevation_meters', None)
                            }
                        # If district mismatch, leave None → Scenario C fills with correct district hotel
                    else:
                        # For subsequent days, check if we need a new hotel via distance
                        if user_hotel_coords and user_hotel_coords[0] and user_hotel_coords[1]:
                            needs_new = _needs_new_hotel(
                                user_hotel_coords[0], user_hotel_coords[1],
                                day_dist_norm, db, budget
                            )
                            if not needs_new:
                                hotel_plan[day-1] = {
                                    "day": day, "hotel_id": user_hotel_obj.hotel_id, "hotel_name": user_hotel_obj.hotel_name,
                                    "latitude": getattr(user_hotel_obj, 'latitude', None), "longitude": getattr(user_hotel_obj, 'longitude', None),
                                    "elevation_meters": getattr(user_hotel_obj, 'elevation_meters', None)
                                }
                        # If needs_new or coords unknown, leave None → Scenario C fills

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
    # Reuse the previous day's hotel if travel time to the next district is ≤ 90 min.
    # Otherwise find a new hotel in the current district.
    last_hotel_for_district = {}
    for i in range(days):
        if hotel_plan[i] is not None:
            continue
        district = _normalize(day_districts[i])

        # Check if we can reuse previous day's hotel
        if i > 0 and hotel_plan[i - 1] is not None:
            prev = hotel_plan[i - 1]
            prev_lat = prev.get("latitude")
            prev_lon = prev.get("longitude")
            if prev_lat and prev_lon:
                needs_new = _needs_new_hotel(prev_lat, prev_lon, district, db, budget)
            else:
                needs_new = True
            if not needs_new:
                hotel_plan[i] = {
                    "day": i + 1, "hotel_id": prev["hotel_id"], "hotel_name": prev["hotel_name"],
                    "latitude": prev["latitude"], "longitude": prev["longitude"],
                    "elevation_meters": prev.get("elevation_meters"),
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

        # If still no hotel, use the previous day's hotel (stay in place)
        if not fallback and i > 0 and hotel_plan[i - 1] is not None:
            reused = hotel_plan[i - 1]
            hotel_plan[i] = {
                "day": i + 1, "hotel_id": reused["hotel_id"], "hotel_name": reused["hotel_name"],
                "latitude": reused["latitude"], "longitude": reused["longitude"],
                "elevation_meters": reused.get("elevation_meters"),
            }
            last_hotel_for_district[district] = hotel_plan[i]
            continue

        if fallback:
            h = fallback[0]
            hotel_plan[i] = {
                "day": i + 1, "hotel_id": h.hotel_id, "hotel_name": h.hotel_name,
                "latitude": getattr(h, 'latitude', None), "longitude": getattr(h, 'longitude', None),
                "elevation_meters": getattr(h, 'elevation_meters', None)
            }
            last_hotel_for_district[district] = hotel_plan[i]

    # Final check: ensure every day has a hotel
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

# District center coordinates for accurate OSRM transit routing.
# Using district headquarters / major settlement coordinates.
DISTRICT_CENTERS = {
    "Kathmandu": (27.7172, 85.3240),
    "Lalitpur": (27.6667, 85.3333),
    "Bhaktapur": (27.6722, 85.4278),
    "Kavrepalanchowk": (27.6167, 85.5500),
    "Nuwakot": (27.9167, 85.1667),
    "Rasuwa": (28.0515, 85.2835),
    "Sindhupalchowk": (27.9667, 85.7000),
    "Dolakha": (27.7333, 86.0833),
    "Chitwan": (27.7000, 84.4333),
    "Sindhuli": (27.2500, 85.9667),
}

def _get_district_center(district: str) -> tuple:
    """Get known center coordinates for a district, or fall back to DB hotel coords."""
    norm = _normalize(district)
    if norm in DISTRICT_CENTERS:
        return DISTRICT_CENTERS[norm]
    return None

def get_transit_info(from_district: str, to_district: str, db: Optional[Session] = None) -> dict:
    """Get OSRM-based travel duration and distance between two districts.
    Uses district center coordinates for accurate road routing.
    Falls back to Haversine at 45 km/h."""
    if not db:
        return {"duration_hours": 3.0, "distance_km": 0.0}
    from_coords = _get_district_center(from_district)
    to_coords = _get_district_center(to_district)
    if not from_coords:
        from_coords = _get_district_coords(from_district, db)
    if not to_coords:
        to_coords = _get_district_coords(to_district, db)
    if from_coords and to_coords:
        try:
            from app.services.osrm_service import get_road_distance
            result = get_road_distance(from_coords[0], from_coords[1], to_coords[0], to_coords[1])
            if result:
                return {
                    "duration_hours": result["duration_min"] / 60.0,
                    "distance_km": result["distance_km"],
                }
        except Exception:
            pass
        from app.logic.route_optimiser import distance_km
        d = distance_km(from_coords[0], from_coords[1], to_coords[0], to_coords[1])
        est_hours = (d / 45.0)
        return {"duration_hours": max(est_hours, 1.0), "distance_km": d}
    return {"duration_hours": 3.0, "distance_km": 0.0}


def _inject_meals(itinerary_days: list, districts_per_day: Optional[list] = None, starting_district: Optional[str] = None, db: Optional[Session] = None, corridor: Optional[list] = None) -> list:
    """Build a realistic daily timeline of events for each day.
    Events include Breakfast, Hotel Checkout, Drive to destination, Arrival,
    Explore attraction, Lunch, Travel, Explore attraction, Hotel Check-in,
    Dinner, Overnight Stay."""
    total_days = len(itinerary_days)
    
    for i, day in enumerate(itinerary_days):
        day_num = day["day"]
        district = day["district"]
        hotel = day["hotel"]
        hotel_name = hotel.get("hotel_name", "Hotel")
        
        # Get raw attractions sorted by their start time
        attractions = [p for p in day.get("places", []) if p.get("type", "place") == "place"]
        attractions.sort(key=lambda x: x.get("start_time", "09:00"))
        
        timeline = []
        
        # 1. Determine if this is a transit day (district changes)
        is_transit_day = False
        prev_district = None
        if i == 0:
            if starting_district and _normalize(starting_district) != _normalize(district):
                is_transit_day = True
                prev_district = starting_district
        else:
            prev_day_district = itinerary_days[i-1]["district"]
            if _normalize(prev_day_district) != _normalize(district):
                is_transit_day = True
                prev_district = prev_day_district
                
        # 2. Breakfast (at hotel/home before starting the day)
        breakfast_time = "07:00" if is_transit_day else "07:30"
        timeline.append({
            "type": "meal",
            "name": "Breakfast",
            "start_time": breakfast_time,
            "duration": 1.0,
            "icon": "🍳",
            "description": f"Enjoy a hearty breakfast at your hotel in {prev_district if is_transit_day and i > 0 else district}."
        })
        
        # 3. Handle transit morning events
        current_time = "08:30"
        if is_transit_day:
            # Hotel Checkout
            checkout_time = "08:00"
            timeline.append({
                "type": "activity",
                "name": "Hotel Checkout" if i > 0 else "Departure Prep",
                "start_time": checkout_time,
                "duration": 0.5,
                "icon": "🔑" if i > 0 else "🎒",
                "description": "Check out from hotel and prepare for travel." if i > 0 else "Get ready to depart for your journey."
            })
            
            # Drive to destination (Transit)
            info = get_transit_info(prev_district, district, db)
            dur_h = info["duration_hours"]
            dist_km = info["distance_km"]
            transport = "Tourist Bus / Micro" if dist_km > 80 else "Private Car / Local Bus"
            
            timeline.append({
                "type": "transit",
                "name": f"Drive from {prev_district} to {district}",
                "start_time": "08:30",
                "duration": round(dur_h, 1),
                "icon": "🚌",
                "transport_mode": transport,
                "travel_dist_km": round(dist_km, 1),
                "description": f"Travel to {district} ({round(dist_km, 1)} km)."
            })
            
            # Arrival / Hotel Check-in
            arrival_time = time_add_hours(time(8, 30), dur_h)
            arrival_time_str = f"{arrival_time.hour:02d}:{arrival_time.minute:02d}"
            
            timeline.append({
                "type": "activity",
                "name": f"Arrival & Hotel Check-in",
                "start_time": arrival_time_str,
                "duration": 0.5,
                "icon": "🏨",
                "description": f"Check in and settle at {hotel_name} in {district}."
            })
            
            current_time = time_add_hours(arrival_time, 0.5)
            
        # 4. Integrate attractions, lunch, and intermediate travel
        lunch_added = False
        
        # On transit days, shift attraction start_times that fall before
        # the check-in time so the timeline is chronologically correct:
        # breakfast → depart → arrive → check-in → explore → lunch → ...
        if is_transit_day:
            ct_minutes = current_time.hour * 60 + current_time.minute if hasattr(current_time, 'hour') else 8 * 60 + 30
            for p in attractions:
                p_start_str = p.get("start_time", "09:00")
                try:
                    ph, pm = p_start_str.split(":")
                    p_minutes = int(ph) * 60 + int(pm)
                except (ValueError, AttributeError):
                    p_minutes = 9 * 60
                if p_minutes < ct_minutes:
                    # Push this attraction to current_time + 10 min buffer
                    new_minutes = ct_minutes + 10
                    new_h = new_minutes // 60
                    new_m = new_minutes % 60
                    p["start_time"] = f"{new_h:02d}:{new_m:02d}"
                    ct_minutes = new_minutes + int(p.get("duration_hours", 2.0) * 60) + 10

        for idx, p in enumerate(attractions):
            p_start = p.get("start_time", "09:00")
            
            # Check if we should insert lunch before this place
            if not lunch_added and p_start >= "12:30":
                timeline.append({
                    "type": "meal",
                    "name": "Lunch",
                    "start_time": "12:30",
                    "duration": 1.0,
                    "icon": "🍛",
                    "description": f"Lunch break in {district}."
                })
                lunch_added = True
            
            # Add Travel/Transit before this place if there is a gap/distance
            travel_dist = p.get("travel_dist_km", 0.0)
            travel_dur_min = p.get("travel_duration_min", 0.0)
            
            if travel_dist > 0:
                travel_dur_h = travel_dur_min / 60.0 if travel_dur_min > 0 else (travel_dist / 30.0)
                travel_dur_min_val = int(travel_dur_h * 60)
                if travel_dur_min_val < 5:
                    travel_dur_min_val = 15
                
                # Deduct travel time from place start time to find travel start time
                p_start_dt = datetime.strptime(p_start, "%H:%M")
                travel_start_dt = p_start_dt - timedelta(minutes=travel_dur_min_val)
                travel_start_str = travel_start_dt.strftime("%H:%M")
                
                timeline.append({
                    "type": "transit",
                    "name": f"Travel to {p['name']}",
                    "start_time": travel_start_str,
                    "duration": round(travel_dur_min_val / 60.0, 2),
                    "icon": "🚗",
                    "transport_mode": p.get("transport_mode", "Private Car / Local Bus"),
                    "travel_dist_km": round(travel_dist, 1),
                    "description": f"Transit to attraction ({round(travel_dist, 1)} km)."
                })
                
            # Add the place itself
            timeline.append(p)
            
        # Check if lunch was added. If not (e.g. no places or all places are morning), add lunch after the last morning place or at 12:30
        if not lunch_added:
            timeline.append({
                "type": "meal",
                "name": "Lunch",
                "start_time": "12:30",
                "duration": 1.0,
                "icon": "🍛",
                "description": f"Lunch break in {district}."
            })
            lunch_added = True
            
        # 5. Last day return transit logic (if ending district is different from starting district)
        is_last_day = (day_num == total_days)
        has_return_transit = False
        if is_last_day and starting_district and _normalize(district) != _normalize(starting_district):
            # We return to starting district in the afternoon/evening
            info = get_transit_info(district, starting_district, db)
            dur_h = info["duration_hours"]
            dist_km = info["distance_km"]
            transport = "Tourist Bus / Micro" if dist_km > 80 else "Private Car / Local Bus"
            
            # Find return start time (e.g. after the last place, or 15:30)
            return_start = "15:30"
            if attractions:
                last_p = attractions[-1]
                last_p_end = time_add_hours(datetime.strptime(last_p["start_time"], "%H:%M").time(), last_p.get("duration", 2.0))
                last_p_end_dt = datetime.combine(datetime.today(), last_p_end)
                return_start_dt = last_p_end_dt + timedelta(minutes=30)
                return_start = return_start_dt.strftime("%H:%M")
                if return_start < "15:30":
                    return_start = "15:30"
            
            # Hotel checkout before return
            checkout_time_dt = datetime.strptime(return_start, "%H:%M") - timedelta(minutes=30)
            checkout_time_str = checkout_time_dt.strftime("%H:%M")
            
            timeline.append({
                "type": "activity",
                "name": "Hotel Checkout",
                "start_time": checkout_time_str,
                "duration": 0.5,
                "icon": "🔑",
                "description": f"Check out from {hotel_name} before departure."
            })
            
            timeline.append({
                "type": "transit",
                "name": f"Return to {starting_district}",
                "start_time": return_start,
                "duration": round(dur_h, 1),
                "icon": "🚌",
                "transport_mode": transport,
                "travel_dist_km": round(dist_km, 1),
                "description": f"Travel back to {starting_district} ({round(dist_km, 1)} km)."
            })
            has_return_transit = True
            
        # 6. Hotel Check-in / Return to Hotel
        # (Only if not returning home on last day)
        if not has_return_transit:
            return_time_str = "17:30"
            if attractions:
                last_p = attractions[-1]
                last_p_end = time_add_hours(datetime.strptime(last_p["start_time"], "%H:%M").time(), last_p.get("duration", 2.0))
                last_p_end_dt = datetime.combine(datetime.today(), last_p_end)
                return_time_dt = last_p_end_dt + timedelta(minutes=30)
                return_time_str = return_time_dt.strftime("%H:%M")
                if return_time_str < "17:00":
                    return_time_str = "17:00"
            
            timeline.append({
                "type": "activity",
                "name": "Hotel Check-in" if is_transit_day else "Return to Hotel",
                "start_time": return_time_str,
                "duration": 0.5,
                "icon": "🏨",
                "description": f"Check in at {hotel_name}." if is_transit_day else f"Return to {hotel_name} and unwind."
            })
            
        # 7. Dinner
        timeline.append({
            "type": "meal",
            "name": "Dinner",
            "start_time": "19:00",
            "duration": 1.0,
            "icon": "🍜",
            "description": "Have dinner at a local restaurant or your hotel."
        })
        
        # 8. Overnight Stay
        if not has_return_transit:
            timeline.append({
                "type": "activity",
                "name": "Overnight Stay",
                "start_time": "20:30",
                "duration": 9.0,
                "icon": "🛌",
                "description": f"Overnight at {hotel_name} in {district}."
            })
        else:
            timeline.append({
                "type": "activity",
                "name": "Arrive Home",
                "start_time": "20:30",
                "icon": "🏡",
                "description": "Welcome back! End of your tour."
            })
            
        # Sort timeline by start_time
        def _sort_key(item):
            t = item.get("start_time", "09:00")
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
    if corridor is None:
        start = city
        end = getattr(pref, "ending_district", "") or start
        corridor = compute_corridor(start, end)

    districts_per_day = [corridor[-1]] * days

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
            p_days_req = max(1, math.ceil(p_raw_val))
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

    # --- Mobility Filter: exclude places harder than user's comfort level ---
    mob_level = mobility.lower().strip() if mobility else "moderate"
    allowed_mobs = {"easy": ["easy"], "moderate": ["easy", "moderate"], "difficult": []}
    if mob_level in allowed_mobs and allowed_mobs[mob_level]:
        for pool in (standard_pool, full_day_pool, multi_day_pool):
            pool[:] = [
                p for p in pool
                if (p.get("mobility") or "").lower() in allowed_mobs[mob_level]
                or not (p.get("mobility") or "").strip()
            ]

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

    # Day 1 transit logic: block Day 1 when there's actual transit between different districts.
    # When start == end (corridor length == 1), Day 1 gets normal activities.
    if not day_slots[0]['is_blocked'] and len(corridor) > 1:
        corridor_distance = 0
        for i in range(len(corridor) - 1):
            info = get_transit_info(corridor[i], corridor[i+1], db)
            corridor_distance += info.get("distance_km", 0)
        if len(corridor) > 2 and corridor_distance <= 180:
            intermediate_districts = [d.lower() for d in corridor[1:-1]]
            stopover_place = None
            for p in standard_pool:
                p_dist = (p.get("district") or "").lower()
                if p_dist in intermediate_districts:
                    first_leg = get_transit_info(corridor[0], corridor[1], db)
                    leg_h = first_leg["duration_hours"]
                    dep_h = 5
                    arr_h = dep_h + int(leg_h)
                    arr_m = int((leg_h - int(leg_h)) * 60)
                    arr_m += 30
                    if arr_m >= 60:
                        arr_h += 1
                        arr_m -= 60
                    if arr_h < 8:
                        arr_h = 8
                    p['duration_hours'] = min(float(p.get("duration_hours", 2.0)), 2.0)
                    p['_start_time'] = f"{arr_h:02d}:{arr_m:02d}"
                    p['_time_of_day'] = "morning"
                    stopover_place = p
                    break
            if stopover_place:
                day_slots[0]['places'].append(stopover_place)
                standard_pool.remove(stopover_place)
        day_slots[0]['is_blocked'] = True

    # Category diversity: when user selects multiple categories, rotate through them
    # so you get a genuine mix (not just the highest-scoring category every time).
    # Adventure gets a gap day enforced. Religious/cultural appear before adventure.
    last_adventure_day = None
    last_category_picked = None
    user_has_religious_cultural = any(c in preferred_categories for c in ["religious", "cultural"])

    # Assign Full-Day Activities — must match the day's district AND preferred categories
    for slot in day_slots:
        if slot['is_blocked'] or not full_day_pool:
            continue
        day_num = slot['day_num']
        slot_district = districts_per_day[day_num - 1] if day_num - 1 < len(districts_per_day) else corridor[-1]
        matched_idx = None
        if preferred_categories:
            # On Day 1, prefer religious/cultural full-day places
            religious_cultural_keys = ("religious", "temple", "stupa", "cultural", "museum")
            if day_num == 1 and user_has_religious_cultural:
                for i, p in enumerate(full_day_pool):
                    p_dist = (p.get("district") or "").lower()
                    p_cat = (p.get("category") or "").lower()
                    if p_dist == slot_district.lower() and any(k in p_cat for k in religious_cultural_keys):
                        matched_idx = i
                        break
            # Fallback: any preferred category
            if matched_idx is None:
                for i, p in enumerate(full_day_pool):
                    p_dist = (p.get("district") or "").lower()
                    p_cat = (p.get("category") or "").lower()
                    if p_dist == slot_district.lower() and any(c in p_cat for c in preferred_categories):
                        matched_idx = i
                        break
        if matched_idx is not None:
            place = full_day_pool.pop(matched_idx)
            slot['is_blocked'] = True
            place['day_label'] = ""
            slot['places'].append(place)
            p_cat = (place.get("category") or "").lower()
            if "adventure" in p_cat:
                last_adventure_day = day_num

    
    # 🔥 5. FILL UNBLOCKED DAYS (GEOGRAPHIC GRAVITY v2 — Elevation + Time + Budget)
    MAX_HOURS_PER_DAY = 8.0
    used_place_ids = set()

    for slot in day_slots:
        if slot['is_blocked']:
            continue
        day_num = slot['day_num']

        is_gap_day = last_adventure_day is not None and day_num == last_adventure_day + 1
        day_district = districts_per_day[day_num - 1] if day_num - 1 < len(districts_per_day) else corridor[-1]

        day_places = []
        current_day_hours = 0.0
        current_time = time(9, 0)
        daily_counts = {"nature": 0, "religious": 0, "cultural": 0, "adventure": 0}
        paid_count = 0

        current_hotel = hotel_plan[slot['day_num'] - 1]
        current_lat = current_hotel.get("latitude")
        current_lon = current_hotel.get("longitude")
        current_elev = get_place_elevation(current_hotel)

        budget_quota = get_budget_quota(int(getattr(pref, "hotel_budget", 5000)))
        fatigue_max = get_travel_fatigue_limits(day_num, mobility)
        day_max_places = min(fatigue_max, MAX_PLACES_PER_DAY)

        # Filter standard pool to only places from this day's district
        day_standard_pool = [p for p in standard_pool if (p.get("district") or "").lower() == day_district.lower()]

        # Weather check: on bad weather days, show only indoor places
        day_weather = weather_by_day.get(day_num, {})
        is_bad_weather = day_weather.get("is_bad_weather", False)
        if is_bad_weather:
            indoor_pool = [
                p for p in day_standard_pool
                if str(p.get("indoor_outdoor", "Outdoor")).lower() == "indoor"
            ]
            if indoor_pool:
                day_standard_pool = indoor_pool
            else:
                day_standard_pool = []
                # Flag for coffee message later
                slot['weather_coffee_day'] = True

        # If no standard places in this day's district, fall back to all corridor districts
        used_fallback = False
        if not day_standard_pool and standard_pool:
            day_standard_pool = list(standard_pool)
            used_fallback = True

        while len(day_places) < day_max_places and current_day_hours < MAX_HOURS_PER_DAY and day_standard_pool:
            best_next_place = None
            best_adjusted_score = -1.0
            candidate_pool = []

            for place in day_standard_pool:
                duration = float(place.get("duration_hours", 2.0))

                # --- Category Key ---
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

                # --- Adventure Gap: skip adventure on the day after an adventure day ---
                if is_gap_day and cat_key == "adventure":
                    continue

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
                p_elev = get_place_elevation(place)
                dist = distance_km_elevation(
                    current_lat, current_lon,
                    place.get('latitude'), place.get('longitude'),
                    current_elev, p_elev
                )
                distance_penalty = (dist / 2.0) * 0.35
                # When using corridor fallback from other districts, reduce penalty
                place_district = (place.get("district") or "").lower()
                if place_district != day_district.lower():
                    distance_penalty *= 0.3
                adjusted_score = base_score - distance_penalty

                # --- Category rotation: ensure a genuine mix of categories ---
                # Penalize the category that was just picked (forces rotation)
                if cat_key == last_category_picked and cat_key != "other":
                    adjusted_score -= 0.3
                # --- Day 1: religious/cultural FIRST, nature discouraged, adventure blocked ---
                if day_num == 1:
                    if cat_key in ("religious", "cultural"):
                        adjusted_score += 1.0   # strongly prefer
                    elif cat_key == "nature":
                        adjusted_score -= 0.5   # nature should come later
                    elif cat_key == "adventure":
                        adjusted_score -= 0.5   # adventure never on day 1
                # On early days (2-3), still prefer religious/cultural when user selected them
                if day_num in (2, 3) and user_has_religious_cultural and cat_key in ("religious", "cultural"):
                    adjusted_score += 0.3
                # On gap days, fill with religious/cultural
                if is_gap_day and cat_key in ("religious", "cultural"):
                    adjusted_score += 0.3

                candidate_pool.append((adjusted_score, place, cat_key, duration, is_paid))

            if not candidate_pool:
                # Fallback: if no candidates from this district, try all remaining places
                if standard_pool:
                    day_standard_pool = list(standard_pool)
                    continue
                break

            # Pick best candidate by adjusted score
            candidate_pool.sort(key=lambda x: x[0], reverse=True)
            best_score, best_place, best_cat, best_dur, best_paid = candidate_pool[0]
            if best_score < -0.5:
                # If best candidate is too far and we haven't tried corridor fallback yet, try it now
                if not used_fallback and standard_pool:
                    day_standard_pool = list(standard_pool)
                    used_fallback = True
                    continue
                # Place is very far; stop for this day
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

            # Advance current_time with traffic-based travel gap to next place
            end_time = time_add_hours(current_time, best_dur)
            travel_gap_min = 15
            if day_places:
                prev_place = day_places[-1]
                tod = "morning" if end_time.hour < 12 else "afternoon" if end_time.hour < 17 else "evening"
                try:
                    traffic_row = db.execute(
                        text("""SELECT estimated_time_minutes FROM traffic
                            WHERE origin_id = :oid AND origin_type = 'place'
                            AND destination_id = :did AND destination_type = 'place'
                            AND time_of_day = :tod LIMIT 1"""),
                        {"oid": prev_place['place_id'], "did": best_place['place_id'], "tod": tod}
                    ).scalar()
                    if traffic_row:
                        travel_gap_min = int(traffic_row)
                except Exception:
                    pass
            current_time = time_add_hours(end_time, travel_gap_min / 60.0)

            if best_cat in daily_counts:
                daily_counts[best_cat] += 1
            if best_paid:
                paid_count += 1

            # Track for category rotation and adventure gap
            last_category_picked = best_cat
            if best_cat == "adventure":
                last_adventure_day = day_num

            standard_pool.remove(best_place)
            day_standard_pool = [p for p in day_standard_pool if p is not best_place]

        slot['places'] = day_places
        # If bad weather and no indoor places available, add placeholder message
        if slot.get('weather_coffee_day'):
            coffee_place = {
                "place_id": -1,
                "place_name": "No indoor places available, you can travel after weather is good",
                "category": "relax",
                "duration_hours": 2.0,
                "indoor_outdoor": "indoor",
                "weather_sensitivity": "No",
                "is_anchor_activity": False,
                "_start_time": "10:00",
                "_time_of_day": "morning",
                "district": day_district,
                "latitude": current_lat,
                "longitude": current_lon,
                "entry_fee": "free",
                "similarity_score": 0.0,
            }
            slot['places'] = [coffee_place]

    # 🔥 5.5 REBALANCE ATTRACTIONS ACROSS DAYS
    # First: inject fallback activities for days that ended up empty
    for slot in day_slots:
        if slot['is_blocked'] or slot.get('places'):
            continue
        day_num = slot['day_num']
        fallback_district = districts_per_day[day_num - 1] if day_num - 1 < len(districts_per_day) else corridor[-1]
        # Find any remaining place in the corridor that matches this day's district
        fallback_place = None
        for p in standard_pool:
            p_dist = (p.get("district") or "").lower()
            if p_dist == fallback_district.lower():
                fallback_place = p
                break
        # Broaden search: any corridor district
        if not fallback_place and standard_pool:
            fallback_place = standard_pool[0]
        if fallback_place:
            fallback_place['_start_time'] = "09:00"
            fallback_place['_time_of_day'] = "morning"
            slot['places'].append(fallback_place)
            standard_pool.remove(fallback_place)
            day_standard_pool_fallback = [p for p in standard_pool if (p.get("district") or "").lower() == fallback_district.lower()]
            # Try to add a second place if available
            if len(slot['places']) < 2 and day_standard_pool_fallback:
                second = day_standard_pool_fallback[0]
                second['_start_time'] = "14:00"
                second['_time_of_day'] = "afternoon"
                slot['places'].append(second)
                standard_pool.remove(second)

    # If standard_pool is exhausted but days are still empty, move one place
    # from the busiest day to the empty day (only if district matches)
    for slot in day_slots:
        if slot['is_blocked'] or slot.get('places'):
            continue
        day_num = slot['day_num']
        empty_district = districts_per_day[day_num - 1] if day_num - 1 < len(districts_per_day) else corridor[-1]
        # Find the busiest unblocked day with 3+ places
        busiest = None
        for s in day_slots:
            if s['is_blocked'] or s['day_num'] == day_num:
                continue
            if len(s.get('places', [])) >= 3:
                if busiest is None or len(s['places']) > len(busiest['places']):
                    busiest = s
        if busiest:
            # Move the last place from busiest to empty if district matches
            for j in range(len(busiest['places']) - 1, -1, -1):
                candidate = busiest['places'][j]
                cand_district = (candidate.get("district") or "").lower()
                if cand_district == empty_district.lower():
                    busiest['places'].pop(j)
                    candidate['_start_time'] = "09:00"
                    candidate['_time_of_day'] = "morning"
                    slot['places'].append(candidate)
                    break

    if len(day_slots) > 1:
        for i in range(len(day_slots) - 1, 0, -1):
            curr_slot = day_slots[i]
            prev_slot = day_slots[i - 1]
            if not curr_slot.get('is_blocked') and not prev_slot.get('is_blocked'):
                if len(curr_slot.get('places', [])) < 2 and len(prev_slot.get('places', [])) >= 3:
                    # Only shift if the place's district matches the receiving day
                    curr_district = districts_per_day[i] if i < len(districts_per_day) else corridor[-1]
                    for j in range(len(prev_slot['places']) - 1, -1, -1):
                        candidate = prev_slot['places'][j]
                        cand_district = (candidate.get("district") or "").lower()
                        if cand_district == curr_district.lower():
                            prev_slot['places'].pop(j)
                            curr_slot['places'].insert(0, candidate)
                            break

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
                "type": "place",
                "place_id": p["place_id"],
                "name": f"{p['place_name']}{p.get('day_label', '')}",
                "category": p["category"],
                "duration": p.get("duration_hours", 8.0),
                "is_anchor_activity": True,
                "indoor_outdoor": (p.get("indoor_outdoor") or "Outdoor").lower(),
                "weather_sensitive": str(p.get("weather_sensitivity", "No")).lower() == "yes",
                "transport_mode": "Walk (Trek)" if p.get("is_trek") else "Private Car / Local Bus",
                "travel_dist_km": 0.0,
                "latitude": p.get("latitude"),
                "longitude": p.get("longitude"),
                "start_time": p.get("_start_time", "07:00"),
                "time_of_day": p.get("_time_of_day", "morning"),
                "district": day_district,
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
                "type": "place",
                "place_id": p["place_id"],
                "name": p["place_name"],
                "category": p["category"],
                "duration": p.get("duration_hours", 2.0),
                "is_anchor_activity": False,
                "indoor_outdoor": (p.get("indoor_outdoor") or "Outdoor").lower(),
                "weather_sensitive": str(p.get("weather_sensitivity", "No")).lower() == "yes",
                "transport_mode": p.get("transport_mode", "Private Car / Local Bus"),
                "travel_dist_km": p.get("travel_dist_km", 0.0),
                "latitude": p.get("latitude"),
                "longitude": p.get("longitude"),
                "start_time": p.get("_start_time", "09:00"),
                "time_of_day": p.get("_time_of_day", "morning"),
                "district": day_district,
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

        final_itinerary.append({
            "day": slot['day_num'],
            "district": day_district,
            "day_title": day_title,
            "hotel": {
                "day": current_hotel["day"],
                "hotel_id": current_hotel["hotel_id"],
                "hotel_name": current_hotel["hotel_name"],
                "latitude": current_hotel.get("latitude"),
                "longitude": current_hotel.get("longitude")
            },
            "places": formatted_places,
            "total_travel_km": round(travel_km, 2),
        })

    # ── Inject meals and realistic timeline events ──
    _inject_meals(final_itinerary, districts_per_day, city, db, corridor)

    return {
        "preference_id": preference_id, "days": days,
        "itinerary": final_itinerary, "used_place_ids": list(used_place_ids),
    }


# ==============================
# 4. MASTER ORCHESTRATOR
# ==============================
def generate_master_itinerary(db: Session, preference_id: int, corridor_override: list = None):
    """
    Master orchestrator entry point.
    Reads preferences, computes corridor, builds the full itinerary.
    Used by the generate_from_hotel route.
    """
    pref = get_preferences(db, preference_id)
    start = getattr(pref, "starting_district", "") or getattr(pref, "district", "")
    end = getattr(pref, "ending_district", "") or start
    
    if corridor_override:
        corridor = corridor_override
    else:
        corridor = compute_corridor(start, end)

    result = build_itinerary(db, preference_id, corridor=corridor)
    result["corridor"] = corridor
    result["district"] = end
    return result