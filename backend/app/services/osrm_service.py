"""
OSRM (Open Source Routing Machine) integration for real road distances.

Uses the free OSRM demo API at http://router.project-osrm.org
Falls back to elevation-aware Haversine if OSRM is unreachable or returns errors.

Returns: {distance_km, duration_min, geometry}
"""
import math
import json
from typing import List, Dict, Optional, Tuple
from urllib.parse import quote

import requests

OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"
REQUEST_TIMEOUT = 20  # seconds


def _build_osrm_url(
    coordinates: List[Tuple[float, float]]
) -> str:
    """Build OSRM request URL from list of (lon, lat) pairs.

    OSRM expects coordinates in longitude,latitude order.
    """
    coord_str = ";".join(f"{lon},{lat}" for lon, lat in coordinates)
    return (
        f"{OSRM_BASE_URL}/{coord_str}"
        f"?overview=full&steps=false&alternatives=false&annotations=false"
    )


def _parse_osrm_response(
    data: dict,
    route_index: int = 0,
) -> Optional[Dict]:
    """Parse OSRM JSON response into a clean dict.

    Returns None if parsing fails.
    """
    try:
        if data.get("code") != "Ok":
            return None

        routes = data.get("routes", [])
        if not routes or route_index >= len(routes):
            return None

        route = routes[route_index]
        distance_km = round(route["distance"] / 1000.0, 2)
        duration_min = round(route["duration"] / 60.0, 1)
        geometry = route.get("geometry")

        return {
            "distance_km": distance_km,
            "duration_min": duration_min,
            "geometry": geometry,
        }
    except (KeyError, IndexError, TypeError, ValueError):
        return None


def get_road_distance(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
) -> Optional[Dict]:
    """Get road distance/duration/geometry between two points via OSRM.

    Args:
        lat1, lon1: Origin coordinates.
        lat2, lon2: Destination coordinates.

    Returns:
        {distance_km, duration_min, geometry} on success, None on failure.
    """
    try:
        coords = [(lon1, lat1), (lon2, lat2)]
        url = _build_osrm_url(coords)
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        return _parse_osrm_response(resp.json())
    except (requests.RequestException, json.JSONDecodeError, ValueError):
        return None


def get_road_route(
    waypoints: List[Dict],
) -> Optional[List[Dict]]:
    """Get road distances/durations/geometries for a full route (chain of points).

    Args:
        waypoints: List of dicts with 'latitude' and 'longitude' keys.
                   First point is origin, last is destination, middle are waypoints.

    Returns:
        List of {distance_km, duration_min, geometry} segments between consecutive points,
        or None if the request fails.
    """
    if not waypoints or len(waypoints) < 2:
        return None

    coords = [(p["longitude"], p["latitude"]) for p in waypoints]
    try:
        url = _build_osrm_url(coords)
        resp = requests.get(url, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        result = _parse_osrm_response(resp.json())
        if result is None or len(waypoints) < 2:
            return None

        # OSRM returns total distance/duration for the whole route.
        # We split it proportionally by Haversine ratio for per-leg estimates.
        # For precise per-leg data, we'd need to use OSRM's `annotations=true`.
        total_dist = result["distance_km"]
        total_dur = result["duration_min"]
        geometry = result["geometry"]

        # Calculate Haversine ratios for each leg
        from app.logic.route_optimiser import distance_km as haversine_dist

        leg_dists = []
        for i in range(len(waypoints) - 1):
            d = haversine_dist(
                waypoints[i]["latitude"], waypoints[i]["longitude"],
                waypoints[i + 1]["latitude"], waypoints[i + 1]["longitude"],
            )
            leg_dists.append(d)

        total_hav = sum(leg_dists) or 1.0
        segments = []
        for i, d in enumerate(leg_dists):
            ratio = d / total_hav
            segments.append({
                "distance_km": round(total_dist * ratio, 2),
                "duration_min": round(total_dur * ratio, 1),
                "geometry": geometry,
            })

        return segments

    except (requests.RequestException, json.JSONDecodeError, ValueError):
        return None


def _make_coords_key(waypoints: List[Dict]) -> str:
    """Generate a cache key from route waypoints."""
    parts = []
    for wp in waypoints:
        parts.append(f"{wp.get('latitude', 0):.4f},{wp.get('longitude', 0):.4f}")
    return "|".join(parts)


def get_route_with_fallback(
    waypoints: List[Dict],
    start_elev: Optional[float] = None,
    use_cache: bool = True,
) -> List[Dict]:
    """Get road distances for a full route, falling back to elevation-aware Haversine.

    Always returns a list of segments (never None).

    Each segment: {distance_km, duration_min, geometry, source}
    - source: "osrm" if from OSRM, "haversine_elevation" if fallback.
    """
    if not waypoints or len(waypoints) < 2:
        return []

    # Check cache first
    if use_cache:
        try:
            from app.services.cache_service import get_cache
            cache = get_cache()
            coords_key = _make_coords_key(waypoints)
            cached = cache.get_cached_osrm_route(coords_key)
            if cached is not None:
                return cached.get("segments", [])
        except Exception:
            pass

    osrm_result = get_road_route(waypoints)
    if osrm_result is not None:
        for seg in osrm_result:
            seg["source"] = "osrm"
        # Cache the OSRM result
        if use_cache:
            try:
                from app.services.cache_service import get_cache
                cache = get_cache()
                coords_key = _make_coords_key(waypoints)
                cache.cache_osrm_route(coords_key, {"segments": osrm_result})
            except Exception:
                pass
        return osrm_result

    # Fallback: elevation-aware Haversine
    from app.logic.route_optimiser import distance_km_elevation, get_place_elevation

    segments = []
    for i in range(len(waypoints) - 1):
        a, b = waypoints[i], waypoints[i + 1]
        elev_a = start_elev if i == 0 and start_elev is not None else get_place_elevation(a)
        elev_b = get_place_elevation(b)
        dist = distance_km_elevation(
            a["latitude"], a["longitude"],
            b["latitude"], b["longitude"],
            elev_a, elev_b,
        )
        duration = round((dist / 30.0) * 60, 1)
        segments.append({
            "distance_km": round(dist, 2),
            "duration_min": duration,
            "geometry": None,
            "source": "haversine_elevation",
        })

    return segments
