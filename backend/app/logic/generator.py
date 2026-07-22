from typing import List, Optional
from sqlalchemy.orm import Session
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


# ──────────────────────────────────────────────
#  Duration helpers
# ──────────────────────────────────────────────

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
        return val * 8.0
    if unit in ("minute", "minutes", "min"):
        return val / 60.0
    return val


def _total_duration_hours(places: List[dict]) -> float:
    """Sum of estimated durations for a list of places."""
    return sum(_place_duration_hours(p) for p in places)


# ──────────────────────────────────────────────
#  Capacity estimation
# ──────────────────────────────────────────────

# A reasonable sightseeing day holds ~5 hours of activities
# (09:30–12:30 morning block + 14:00–17:00 afternoon block).
SIGHTSEEING_HOURS_PER_DAY = 5.0


def estimate_max_days(num_places: int, places: Optional[List[dict]] = None) -> int:
    """Estimate how many sightseeing days a pool of places can fill.

    Uses the ACTUAL average duration of all provided places, not just the first
    one, to give an accurate capacity estimate.  Day-1 and last-day each hold
    at most 1 place; middle days fill to SIGHTSEEING_HOURS_PER_DAY.
    """
    if num_places <= 0:
        return 0
    if num_places == 1:
        return 1
    if num_places == 2:
        return 2

    if places:
        durations = [_place_duration_hours(p) for p in places[:num_places]]
        avg_dur = sum(durations) / len(durations) if durations else 2.0
        per_day = max(1, min(5, int(SIGHTSEEING_HOURS_PER_DAY / max(avg_dur, 0.5))))
        middle = num_places - 2
        return 2 + math.ceil(middle / per_day)

    middle = num_places - 2
    return 2 + math.ceil(middle / 3)


# ──────────────────────────────────────────────
#  Balanced allocation (duration-aware)
# ──────────────────────────────────────────────

def allocate_places_balanced(
    num_places: int,
    travel_days: int,
    places: Optional[List[dict]] = None,
) -> List[int]:
    """Distribute places across days, respecting duration constraints.

    Rules:
      - Day 1 (arrival): at most 1 place.
      - Last day (departure): at most 1 place.
      - Middle days: pack to ~SIGHTSEEING_HOURS_PER_DAY using actual durations
        when available; otherwise max 3.
      - Never invent places. If pool runs out remaining days get 0.
      - Rebalance: move one place to the last day when possible so every day
        feels meaningful.
    """
    if num_places <= 0 or travel_days <= 0:
        return []

    # ── single-day ──
    if travel_days == 1:
        if places:
            dur = _total_duration_hours(places[:num_places])
            cap = max(1, min(5, int(SIGHTSEEING_HOURS_PER_DAY / max(dur / num_places, 0.5))))
        else:
            cap = 3
        return [min(num_places, cap)]

    # ── exactly 1 place ──
    if num_places == 1:
        return [1] + [0] * (travel_days - 1)

    # ── exactly 2 places ──
    if num_places == 2:
        return [1, 1] + [0] * (travel_days - 2)

    # ── two days ──
    if travel_days == 2:
        if places:
            per = max(1, min(5, int(SIGHTSEEING_HOURS_PER_DAY / max(_place_duration_hours(places[0]), 0.5))))
        else:
            per = 3
        first = min(max(1, num_places // 2), per)
        return [first, num_places - first]

    # ── travel_days >= 3 ──
    # Determine middle-day capacity using ACTUAL average durations
    if places:
        durations = [_place_duration_hours(p) for p in places[:num_places]]
        avg_dur = sum(durations) / len(durations) if durations else 2.0
        max_per_day = max(1, min(5, int(SIGHTSEEING_HOURS_PER_DAY / max(avg_dur, 0.5))))
    else:
        max_per_day = 3

    allocations = [1]  # Day 1
    pool = num_places - 1
    middle_days = travel_days - 2

    if pool <= 0:
        allocations.extend([0] * middle_days)
        allocations.append(0)
        return allocations

    # Fill middle days evenly
    base = pool // middle_days
    remainder = pool % middle_days
    for i in range(middle_days):
        give = min(base + (1 if i < remainder else 0), max_per_day)
        allocations.append(give)

    # How many places went to middle days
    middle_used = sum(allocations[1:])
    last_day_give = pool - middle_used
    last_day_give = min(max(last_day_give, 0), max_per_day)
    allocations.append(last_day_give)
    leftover = pool - middle_used - last_day_give

    # Redistribute leftover to middle days under capacity
    day_idx = 1
    while leftover > 0 and day_idx < len(allocations) - 1:
        if allocations[day_idx] < max_per_day:
            allocations[day_idx] += 1
            leftover -= 1
        day_idx += 1
        if day_idx >= len(allocations) - 1:
            day_idx = 1

    # Rebalance: if last day < 2 and a middle day has > 1, move one there
    if allocations[-1] < 2 and any(a > 1 for a in allocations[1:-1]):
        for i in range(1, len(allocations) - 1):
            if allocations[i] > 1:
                allocations[i] -= 1
                allocations[-1] += 1
                break

    return allocations


# ──────────────────────────────────────────────
#  Route optimisation
# ──────────────────────────────────────────────

def optimize_route(places: List[dict], hotel: dict) -> List[dict]:
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


# ──────────────────────────────────────────────
#  Itinerary generation
# ──────────────────────────────────────────────

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
    """Generate a balanced, duration-aware sightseeing itinerary.

    Returns a dict with:
      - preference_id, planning_mode, days
      - itinerary: list of day dicts, each with:
          day, district, hotel, places, total_places, day_type, schedule
      - total_places_available, total_places_used
    """
    if not hotels:
        raise Exception("No hotels available")

    # ── Resolve anchor hotel ──
    if planning_mode == "user_anchor" and selected_hotel_id:
        anchor_hotel = next(
            (h for h in hotels if h["hotel_id"] == selected_hotel_id), None
        )
        if not anchor_hotel:
            anchor_hotel = hotels[0]
    else:
        anchor_hotel = hotels[0]

    # ── Filter: treks must NEVER appear in sightseeing ──
    normal_places = [p for p in places if not p.get("is_trek")]

    if include_transit and extra_places:
        normal_places.extend([p for p in extra_places if not p.get("is_trek")])

    if not normal_places:
        raise Exception("No non-trek places found for itinerary")

    # ── Sort by distance from hotel ──
    for p in normal_places:
        p["_dist"] = haversine(
            anchor_hotel["latitude"], anchor_hotel["longitude"],
            p["latitude"], p["longitude"],
        )
    normal_places.sort(key=lambda x: x["_dist"])

    # ── Duration-aware allocation ──
    allocations = allocate_places_balanced(
        len(normal_places), travel_days, places=normal_places
    )

    # ── Build each day ──
    used_indices: set = set()
    itinerary = []

    for day_num in range(1, travel_days + 1):
        count = allocations[day_num - 1] if day_num <= len(allocations) else 0

        # Pick closest available places
        day_places = []
        for idx, place in enumerate(normal_places):
            if idx not in used_indices:
                day_places.append(place)
                used_indices.add(idx)
                if len(day_places) >= count:
                    break

        # Optimise intra-day route
        ordered = optimize_route(day_places, anchor_hotel)

        # Distance metadata
        for p in ordered:
            p["distance_from_hotel_km"] = round(p["_dist"], 2)

        # Travel-time metadata between consecutive stops
        prev_lat = anchor_hotel["latitude"]
        prev_lon = anchor_hotel["longitude"]
        for p in ordered:
            dist_km = haversine(prev_lat, prev_lon, p["latitude"], p["longitude"])
            travel_min = max(10, round(dist_km * 3))
            p["travel_time_to_next_min"] = travel_min
            p["travel_dist_km"] = round(dist_km, 1)
            cat = (p.get("category") or "").lower()
            if "nature" in cat:
                p["activity_label"] = "Explore"
            elif "religious" in cat:
                p["activity_label"] = "Visit"
            elif "cultural" in cat:
                p["activity_label"] = "Visit"
            else:
                p["activity_label"] = "Visit"
            prev_lat = p["latitude"]
            prev_lon = p["longitude"]

        is_first = day_num == 1 and travel_days > 1
        is_last = day_num == travel_days and travel_days > 1
        is_single = travel_days == 1

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

        # Assign day_type + note
        if is_first:
            day_entry["day_type"] = "arrival"
            if ordered:
                day_entry["note"] = (
                    "Arrival day — check in and explore one nearby attraction."
                )
            else:
                day_entry["note"] = (
                    "Arrival day — settle in and explore the area around your hotel."
                )
        elif is_last:
            day_entry["day_type"] = "departure"
            if ordered:
                day_entry["note"] = (
                    "Last day — visit a final attraction before heading home."
                )
            else:
                day_entry["note"] = (
                    "Departure day — check out and begin your journey home."
                )
        elif not ordered and day_num < travel_days:
            day_entry["day_type"] = "explored_all"
            day_entry["note"] = (
                "Your planned sightseeing has been completed. "
                "Enjoy a relaxed day at your own pace — revisit a "
                "favourite spot or explore the area around your hotel."
            )
        else:
            day_entry["day_type"] = "sightseeing"

        itinerary.append(day_entry)

    # ── Final safety: if a middle day is empty but places remain, fill it ──
    unused = [p for i, p in enumerate(normal_places) if i not in used_indices]
    for day_entry in itinerary:
        if not unused:
            break
        dt = day_entry.get("day_type")
        if dt in ("sightseeing", "explored_all") and day_entry["total_places"] == 0:
            day_entry["places"] = [unused.pop(0)]
            day_entry["total_places"] = 1
            day_entry["day_type"] = "sightseeing"
            day_entry["note"] = ""

    used_count = sum(d["total_places"] for d in itinerary)

    return {
        "preference_id": preference_id,
        "planning_mode": planning_mode,
        "days": travel_days,
        "itinerary": itinerary,
        "total_places_available": len(normal_places),
        "total_places_used": used_count,
    }
