


# app/logic/route_optimiser.py
import math
from typing import List, Dict, Any, Optional


def distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Standard Haversine distance in km."""
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def elevation_multiplier(elev1: Optional[float], elev2: Optional[float]) -> float:
    """
    Terrain multiplier based on elevation difference.
    Nepal is mountainous — straight-line Haversine underestimates real travel effort.

    Elevation diff < 200m  → multiplier 1.3  (gentle hills)
    Elevation diff 200-1000m → multiplier 1.6 (moderate terrain)
    Elevation diff > 1000m → multiplier 2.0  (mountainous / steep)
    """
    if elev1 is None or elev2 is None:
        return 1.3
    diff = abs(float(elev1) - float(elev2))
    if diff < 200:
        return 1.3
    elif diff <= 1000:
        return 1.6
    else:
        return 2.0


def distance_km_elevation(
    lat1: float, lon1: float, lat2: float, lon2: float,
    elev1: Optional[float] = None, elev2: Optional[float] = None
) -> float:
    """
    Elevation-aware distance: Haversine * terrain multiplier.
    Falls back to standard Haversine if elevations are missing.
    """
    base = distance_km(lat1, lon1, lat2, lon2)
    mult = elevation_multiplier(elev1, elev2)
    return base * mult


def get_place_elevation(place: Dict[str, Any]) -> Optional[float]:
    """Safely extract elevation_meters from a place dict (hotel or itinerary place)."""
    val = place.get('elevation_meters')
    if val is None:
        val = place.get('elevation')
    return float(val) if val is not None else None


def _route_cost(
    ordered: List[Dict[str, Any]],
    start_lat: float, start_lon: float,
    start_elev: Optional[float] = None,
    return_to_hotel: bool = False,
) -> float:
    """Total travel distance (elevation-aware) for an ordered list of places."""
    total = 0.0
    lat, lon = start_lat, start_lon
    elev = start_elev
    for p in ordered:
        p_elev = get_place_elevation(p)
        total += distance_km_elevation(lat, lon, p.get('latitude'), p.get('longitude'), elev, p_elev)
        lat, lon = p.get('latitude'), p.get('longitude')
        elev = p_elev
    if return_to_hotel and ordered:
        total += distance_km_elevation(lat, lon, start_lat, start_lon, elev, start_elev)
    return total


def _nearest_neighbor(
    places: List[Dict[str, Any]],
    start_lat: float, start_lon: float,
    start_elev: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """Greedy nearest-neighbor heuristic for initial route."""
    if len(places) <= 2:
        return list(places)

    unvisited = list(places)
    route = []
    lat, lon = start_lat, start_lon
    elev = start_elev

    while unvisited:
        best = min(unvisited, key=lambda p: distance_km_elevation(
            lat, lon, p.get('latitude'), p.get('longitude'), elev, get_place_elevation(p)
        ))
        route.append(best)
        lat, lon = best.get('latitude'), best.get('longitude')
        elev = get_place_elevation(best)
        unvisited.remove(best)

    return route


def _two_opt(
    route: List[Dict[str, Any]],
    start_lat: float, start_lon: float,
    start_elev: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """2-opt local search to improve a route by swapping edge pairs."""
    if len(route) <= 2:
        return route

    improved = True
    best = list(route)
    best_cost = _route_cost(best, start_lat, start_lon, start_elev)

    while improved:
        improved = False
        for i in range(len(best) - 1):
            for k in range(i + 1, len(best)):
                candidate = best[:i] + best[i:k + 1][::-1] + best[k + 1:]
                candidate_cost = _route_cost(candidate, start_lat, start_lon, start_elev)
                if candidate_cost < best_cost:
                    best = candidate
                    best_cost = candidate_cost
                    improved = True

    return best


def optimize_daily_route(
    start_lat: float, start_lon: float,
    places: List[Dict[str, Any]],
    start_elev: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Route optimizer using Nearest Neighbor + 2-opt improvement.
    Considers elevation-aware distances. Respects visit duration by placing
    longer-duration activities earlier in the day (before fatigue sets in).

    For very small routes (≤ 6 places), also considers a duration-weighted
    variant to balance travel distance with sensible activity ordering.
    """
    if not places:
        return []
    if len(places) == 1:
        return places

    # Build initial route via nearest neighbor
    route = _nearest_neighbor(places, start_lat, start_lon, start_elev)

    # Apply 2-opt improvement
    route = _two_opt(route, start_lat, start_lon, start_elev)

    # For small sets, also try a duration-weighted sort:
    # longer activities first (when energy is highest), but only if it doesn't
    # increase total travel distance by more than 20%.
    if len(places) <= 6:
        dur_sorted = sorted(route, key=lambda p: float(p.get("duration_hours", 2.0)), reverse=True)
        dur_cost = _route_cost(dur_sorted, start_lat, start_lon, start_elev)
        nn_cost = _route_cost(route, start_lat, start_lon, start_elev)
        if dur_cost <= nn_cost * 1.2:
            route = dur_sorted

    return route


def calculate_total_distance(
    start_lat: float, start_lon: float,
    route: List[Dict[str, Any]],
    return_to_hotel: bool = True,
    start_elev: Optional[float] = None
) -> float:
    """Total elevation-aware distance for a day's route."""
    if not route:
        return 0.0
    total_dist = 0.0
    curr_lat, curr_lon = start_lat, start_lon
    curr_elev = start_elev
    for place in route:
        p_elev = get_place_elevation(place)
        total_dist += distance_km_elevation(
            curr_lat, curr_lon,
            place.get('latitude'), place.get('longitude'),
            curr_elev, p_elev
        )
        curr_lat, curr_lon = place.get('latitude'), place.get('longitude')
        curr_elev = p_elev
    if return_to_hotel:
        total_dist += distance_km_elevation(
            curr_lat, curr_lon, start_lat, start_lon,
            curr_elev, start_elev
        )
    return round(total_dist, 2)


# ==============================
# OSRM-ENHANCED ROUTE FUNCTIONS
# ==============================

def build_waypoints(
    start_lat: float, start_lon: float,
    places: List[Dict[str, Any]],
    return_to_hotel: bool = False,
    start_elev: Optional[float] = None,
) -> List[Dict]:
    """Build a list of waypoint dicts from a start point and ordered places.

    Each dict has 'latitude', 'longitude', and optionally 'elevation_meters'.
    """
    waypoints = [{"latitude": start_lat, "longitude": start_lon, "elevation_meters": start_elev}]
    for p in places:
        wp = {
            "latitude": p.get("latitude"),
            "longitude": p.get("longitude"),
            "elevation_meters": get_place_elevation(p),
        }
        waypoints.append(wp)
    if return_to_hotel and places:
        waypoints.append({"latitude": start_lat, "longitude": start_lon, "elevation_meters": start_elev})
    return waypoints


def calculate_total_distance_osrm(
    start_lat: float, start_lon: float,
    route: List[Dict[str, Any]],
    return_to_hotel: bool = True,
    start_elev: Optional[float] = None,
) -> Dict:
    """Calculate total route distance using OSRM with fallback.

    Returns:
        {
            "total_km": float,
            "total_duration_min": float,
            "segments": List[Dict],
            "source": "osrm" | "haversine_elevation"
        }
    """
    if not route:
        return {"total_km": 0.0, "total_duration_min": 0.0, "segments": [], "source": "none"}

    waypoints = build_waypoints(start_lat, start_lon, route, return_to_hotel, start_elev)

    try:
        from app.services.osrm_service import get_route_with_fallback
        segments = get_route_with_fallback(waypoints, start_elev)
    except ImportError:
        # Fallback to elevation-aware Haversine if OSRM service not available
        segments = []
        curr_lat, curr_lon = start_lat, start_lon
        curr_elev = start_elev
        points = route + ([{"latitude": start_lat, "longitude": start_lon}] if return_to_hotel else [])
        for p in points:
            p_elev = get_place_elevation(p)
            d = distance_km_elevation(curr_lat, curr_lon, p.get('latitude'), p.get('longitude'), curr_elev, p_elev)
            segments.append({"distance_km": round(d, 2), "duration_min": round((d / 30.0) * 60, 1), "geometry": None, "source": "haversine_elevation"})
            curr_lat, curr_lon = p.get('latitude'), p.get('longitude')
            curr_elev = p_elev

    total_km = round(sum(s["distance_km"] for s in segments), 2)
    total_min = round(sum(s["duration_min"] for s in segments), 1)
    source = segments[0].get("source", "haversine_elevation") if segments else "none"

    return {
        "total_km": total_km,
        "total_duration_min": total_min,
        "segments": segments,
        "source": source,
    }