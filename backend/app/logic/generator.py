from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import math


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimate_max_days(num_places: int, places: Optional[List[dict]] = None) -> int:
    """Estimate max sightseeing days given a pool of places.

    If *places* is provided, uses estimated durations to calculate capacity;
    otherwise falls back to the fixed rule:
      Day 1 = 1 place (arrival), last day = 1 place (departure),
      middle days = up to 3 places each.
    """
    if num_places <= 0:
        return 0
    if num_places == 1:
        return 1
    if num_places == 2:
        return 2

    # Duration-aware: compute per-day capacity from real durations
    if places:
        durations = [_place_duration_hours(p) for p in places if not p.get("is_trek")]
        durations = [d for d in durations if d > 0]
        avg_dur = sum(durations) / len(durations) if durations else 2.0
        per_day = _max_places_for_hours(5.0, avg_dur)
        per_day = max(1, min(per_day, 5))
    else:
        per_day = 3

    middle = num_places - 2
    return 2 + math.ceil(middle / per_day)


def _place_duration_hours(place: dict) -> float:
    """Return the estimated duration of a place in hours.

    Defaults to 2.0 hours if no duration data is present.
    """
    val = place.get("estimated_duration_value")
    unit = (place.get("estimated_duration_unit") or "hours").lower().strip()
    try:
        val = float(val)
    except (TypeError, ValueError):
        val = 2.0
    if unit in ("day", "days"):
        return val * 8.0   # treat a sightseeing "day" as ~8 hours
    if unit in ("minute", "minutes", "min"):
        return val / 60.0
    return val              # assume hours


def _max_places_for_hours(target_hours: float, avg_hours: float) -> int:
    """How many places (at avg_hours each) fit within target_hours."""
    if avg_hours <= 0:
        return 3
    return max(1, int(target_hours / avg_hours))


def allocate_places_balanced(
    num_places: int,
    travel_days: int,
    places: Optional[List[dict]] = None,
) -> List[int]:
    """Distribute places across days, duration-aware when *places* is supplied.

    Rules:
      - Day 1 gets at most 1 place (arrival / settle in).
      - Last day (if > 1 day) gets at most 1 place.
      - Middle days: if duration info is available, pack based on ~5 hours of
        sightseeing per day; otherwise fall back to a max of 3 places/day.
      - Never leave a day empty if places remain.
      - Never invent places: if pool runs out, remaining days get 0.
    """
    if num_places <= 0 or travel_days <= 0:
        return []

    # Determine per-day capacity
    if places:
        durations = [_place_duration_hours(p) for p in places if not p.get("is_trek")]
        durations = [d for d in durations if d > 0]
        avg_dur = sum(durations) / len(durations) if durations else 2.0
        max_per_day = _max_places_for_hours(5.0, avg_dur)  # ~5h sightseeing/day
        max_per_day = max(1, min(max_per_day, 5))          # clamp 1–5
    else:
        avg_dur = 2.0
        max_per_day = 3

    if travel_days == 1:
        return [min(num_places, max_per_day)]

    if num_places == 1:
        return [1] + [0] * (travel_days - 1)

    if travel_days == 2:
        half = min(num_places // 2, max_per_day)
        return [half, num_places - half]

    # travel_days >= 3
    allocations = [1]  # Day 1
    pool = num_places - 1
    middle_days = travel_days - 2

    if pool <= 0:
        allocations.extend([0] * middle_days)
        allocations.append(0)
        return allocations

    # Distribute middle days evenly, respecting duration-based capacity
    per_day = min(max_per_day, max(1, pool // middle_days))
    for _ in range(middle_days):
        give = min(per_day, pool)
        allocations.append(give)
        pool -= give

    # Distribute remainder one-by-one to middle days under capacity
    day_idx = 1
    while pool > 0 and day_idx < len(allocations):
        if allocations[day_idx] < max_per_day:
            allocations[day_idx] += 1
            pool -= 1
        day_idx += 1
        if day_idx >= len(allocations):
            day_idx = 1

    # Last day — give whatever remains (at least 1 if possible)
    allocations.append(pool + 1 if pool > 0 else 1)

    return allocations


def optimize_route(places: List[dict], hotel: dict):
    """Nearest-neighbour greedy route optimisation."""
    if not places:
        return []
    if not hotel:
        return places

    remaining = places[:]
    route = []
    curr_lat = hotel["latitude"]
    curr_lon = hotel["longitude"]

    while remaining:
        nearest = min(
            remaining,
            key=lambda p: haversine(curr_lat, curr_lon, p["latitude"], p["longitude"])
        )
        route.append(nearest)
        curr_lat = nearest["latitude"]
        curr_lon = nearest["longitude"]
        remaining.remove(nearest)

    return route


def generate_itinerary(
    db: Session,
    preference_id: int,
    places: List[dict],
    hotels: List[dict],
    planning_mode: str,
    selected_hotel_id: Optional[int] = None,
    travel_days: int = 3,
    categories: Optional[str] = None,
    include_transit: bool = False,
    extra_places: Optional[List[dict]] = None,
    district: Optional[str] = None,
):
    """Generate a balanced sightseeing itinerary.

    Args:
        include_transit: If True, merge extra_places into the pool.
        extra_places: Places from nearby transit districts.
    """
    if not hotels:
        raise Exception("No hotels available")

    # Resolve anchor hotel
    if planning_mode == "user_anchor" and selected_hotel_id:
        anchor_hotel = next(
            (h for h in hotels if h["hotel_id"] == selected_hotel_id), None
        )
        if not anchor_hotel:
            anchor_hotel = hotels[0]
    else:
        anchor_hotel = hotels[0]

    # Filter out treks from normal itinerary
    normal_places = [p for p in places if not p.get("is_trek")]

    # Detect adventure places in pool — caller may redirect to trek flow
    adventure_places = [p for p in places if p.get("is_trek")]

    if include_transit and extra_places:
        normal_places.extend([p for p in extra_places if not p.get("is_trek")])

    if not normal_places:
        raise Exception("No non-trek places found for itinerary")

    # Sort all places by distance from hotel
    for p in normal_places:
        p["_dist"] = haversine(
            anchor_hotel["latitude"], anchor_hotel["longitude"],
            p["latitude"], p["longitude"]
        )
    normal_places.sort(key=lambda x: x["_dist"])

    # Duration-aware balanced allocation
    allocations = allocate_places_balanced(
        len(normal_places), travel_days, places=normal_places
    )

    # Track which places have been used (for balanced fill)
    used_indices = set()
    itinerary = []

    for day_num in range(1, travel_days + 1):
        count = allocations[day_num - 1] if day_num <= len(allocations) else 0

        # Pick next available places (closest-first since list is sorted)
        day_places = []
        for idx, place in enumerate(normal_places):
            if idx not in used_indices:
                day_places.append(place)
                used_indices.add(idx)
                if len(day_places) >= count:
                    break

        # Optimize route within the day
        ordered = optimize_route(day_places, anchor_hotel)

        # Add distance info
        for p in ordered:
            p["distance_from_hotel_km"] = round(p["_dist"], 2)

        # Day label
        is_arrival_day = (day_num == 1 and travel_days > 1 and len(allocations) > 1)
        is_last_day = (day_num == travel_days and travel_days > 1)

        day_entry = {
            "day": day_num,
            "district": district or anchor_hotel.get("district", ""),
            "hotel": {
                "hotel_id": anchor_hotel["hotel_id"],
                "hotel_name": anchor_hotel["hotel_name"],
                "latitude": anchor_hotel["latitude"],
                "longitude": anchor_hotel["longitude"],
                "district": anchor_hotel.get("district", district or ""),
            },
            "places": ordered,
            "total_places": len(ordered),
        }

        if is_arrival_day and not ordered:
            day_entry["day_type"] = "arrival"
            day_entry["note"] = (
                "Arrival day — settle in and explore the area around your hotel."
            )
        elif is_last_day and not ordered:
            day_entry["day_type"] = "departure"
            day_entry["note"] = (
                "Departure day — check out and begin your journey home."
            )
        elif not ordered and day_num < travel_days:
            day_entry["day_type"] = "explored_all"
            day_entry["note"] = (
                "You have explored all recommended attractions in this destination."
            )
        else:
            day_entry["day_type"] = "sightseeing"

        itinerary.append(day_entry)

    # Check if any sightseeing day is empty when places still exist unused
    # This should not happen with balanced allocation, but handle edge case
    unused_count = len(normal_places) - len(used_indices)
    if unused_count > 0:
        # Try to fill empty days by redistributing from unused pool
        unused = [p for i, p in enumerate(normal_places) if i not in used_indices]
        for day_entry in itinerary:
            if day_entry["total_places"] == 0 and day_entry["day_type"] == "sightseeing":
                if unused:
                    day_entry["places"] = [unused.pop(0)]
                    day_entry["total_places"] = 1
                    day_entry["day_type"] = "sightseeing"

    return {
        "preference_id": preference_id,
        "planning_mode": planning_mode,
        "days": travel_days,
        "itinerary": itinerary,
        "total_places_available": len(normal_places),
        "total_places_used": len(used_indices),
    }
