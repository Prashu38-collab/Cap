"""
Return Route logic — handles the last day of an itinerary.

When the destination is different from the starting district,
the last day includes:

    1. Travel from destination back through the corridor
    2. Optional transit attraction in the last intermediate district
    3. Return to starting district

The transit attraction is only recommended if:
    - Enough travel time remains
    - Attraction is close to the return route
    - Visit duration is short
    - It hasn't been visited before
"""

from typing import List, Dict, Optional, Any

from app.logic.transit_recommender import (
    pick_transit_place,
    get_transit_config,
)
from app.logic.route_optimiser import distance_km

# ──────────────────────────────────────────────
# CONFIGURABLE RETURN ROUTE SETTINGS
# ──────────────────────────────────────────────
RETURN_CONFIG = {
    "min_travel_time_for_stop_hours": 3.0,
    "max_return_visit_hours": 1.5,
    "return_breakfast_time": "07:00",
    "return_departure_time": "08:00",
}


def get_return_config(key: str, default=None):
    return RETURN_CONFIG.get(key, default)


def should_suggest_return_stop(
    travel_time_hours: float,
    remaining_time_hours: float,
    places_visited_today: int,
    max_places: int,
) -> bool:
    """Determine if a return transit stop is worth suggesting.

    Args:
        travel_time_hours: Estimated travel time from destination back to start.
        remaining_time_hours: Time available after accounting for travel.
        places_visited_today: Number of places already in the day.
        max_places: Maximum places allowed for the day.

    Returns:
        True if a return stop should be attempted.
    """
    if places_visited_today >= max_places:
        return False
    if travel_time_hours < RETURN_CONFIG["min_travel_time_for_stop_hours"]:
        return False
    if remaining_time_hours < RETURN_CONFIG["max_return_visit_hours"]:
        return False
    return True


def get_return_transit_segments(corridor: list) -> list:
    """Get ordered transit segments for the return journey.

    The corridor is reversed: destination → ... → start.
    Returns list of (from_district, to_district) tuples.
    """
    if len(corridor) < 2:
        return []
    reversed_corridor = list(reversed(corridor))
    segments = []
    for i in range(len(reversed_corridor) - 1):
        segments.append((reversed_corridor[i], reversed_corridor[i + 1]))
    return segments


def get_return_stop_district(corridor: list) -> Optional[str]:
    """Get the best intermediate district for a return transit stop.

    This is the first intermediate district after the destination
    when travelling back (i.e., corridor[-2] if corridor has >2 districts).
    """
    if len(corridor) <= 2:
        return None
    # corridor = [start, intermediate..., destination]
    # On return, we pass through corridor[-2] first
    return corridor[-2]


def estimate_return_timeline(
    corridor: list,
    transit_data: dict,
    departure_time: str = None,
) -> dict:
    """Estimate the return timeline for the last day.

    Args:
        corridor: Full corridor (start → ... → destination).
        transit_data: Transit lookup table (from build_transit_table).

    Returns:
        Dict with 'segments', 'total_travel_hours', 'arrival_time'.
    """
    if departure_time is None:
        departure_time = RETURN_CONFIG["return_departure_time"]

    segments = get_return_transit_segments(corridor)
    total_hours = 0.0
    detailed = []

    for from_d, to_d in segments:
        key = (from_d.lower().strip(), to_d.lower().strip())
        td = None
        if transit_data:
            td = transit_data.get(key)
        if td is None:
            from app.logic.itinerary_engine import _departure_dict
            td = {"duration_hours": 2.0}

        hours = td.get("duration_hours", 2.0)
        total_hours += hours
        detailed.append({
            "from": from_d,
            "to": to_d,
            "duration_hours": hours,
        })

    dep_h, dep_m = [int(x) for x in departure_time.split(":")]
    dep_minutes = dep_h * 60 + dep_m
    arr_minutes = dep_minutes + int(total_hours * 60)
    arr_h = (arr_minutes // 60) % 24
    arr_m = arr_minutes % 60

    return {
        "segments": detailed,
        "total_travel_hours": round(total_hours, 1),
        "departure_time": departure_time,
        "arrival_time": f"{arr_h:02d}:{arr_m:02d}",
    }
