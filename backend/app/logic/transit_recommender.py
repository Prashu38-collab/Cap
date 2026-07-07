"""
Transit Recommender — selects suitable places along transit corridors.

Rules:
  - Place must be close to the actual road corridor (not just in the district)
  - Visit duration must be short (< threshold)
  - Must not be a trek
  - Must be open during travel time
  - Must satisfy transport-mode constraints:
      * Bus/Tourist Bus/Micro: place must be walking distance from highway stop
      * Private Car/Taxi/Jeep: small detours allowed (configurable)
  - No backtracking: place must be forward along the corridor
"""

from typing import List, Dict, Optional, Tuple

from app.logic.route_optimiser import distance_km

# ──────────────────────────────────────────────
# CONFIGURABLE THRESHOLDS
# ──────────────────────────────────────────────
TRANSIT_CONFIG = {
    "max_detour_km": 10.0,            # Max detour for private vehicle
    "max_bus_detour_km": 1.0,         # Max detour for bus (walking distance from stop)
    "max_visit_hours": 2.0,           # Max duration for transit stop
    "detour_reject_threshold_km": 15.0, # Hard reject if detour exceeds this
    "bus_reject_threshold_km": 2.0,    # Hard reject for bus if detour exceeds this
    "min_breakfast_time": "07:00",
    "max_arrival_time": "20:00",
    "default_transit_duration": 1.5,
    "backtracking_penalty": 100.0,     # Heavy penalty for backtracking
    "route_continuity_weight": 0.3,
    "detour_penalty_weight": 0.4,
    "travel_time_penalty_weight": 0.2,
    "backtrack_penalty_weight": 0.5,
}


def get_transit_config(key: str, default=None):
    """Get a transit configuration value."""
    return TRANSIT_CONFIG.get(key, default)


def _project_onto_corridor(
    p_lat: float, p_lon: float,
    corridor_points: List[Tuple[float, float]],
) -> Tuple[float, int]:
    """Return the minimum distance from a point to the corridor polyline,
    and the index of the nearest segment.

    A corridor is defined as an ordered list of (lat, lon) points.
    Returns (min_distance_km, segment_index).
    """
    if not corridor_points or len(corridor_points) < 2:
        return 999.0, -1

    min_dist = float("inf")
    best_seg = -1

    for i in range(len(corridor_points) - 1):
        a_lat, a_lon = corridor_points[i]
        b_lat, b_lon = corridor_points[i + 1]
        d = _point_segment_distance(p_lat, p_lon, a_lat, a_lon, b_lat, b_lon)
        if d < min_dist:
            min_dist = d
            best_seg = i

    return min_dist, best_seg


def _point_segment_distance(
    px: float, py: float,
    ax: float, ay: float,
    bx: float, by: float,
) -> float:
    """Distance from point P to line segment AB in km (approximate)."""
    import math

    # Convert degrees to approximate km
    lat_scale = 111.0
    lon_scale = 111.0 * math.cos(math.radians((ay + by) / 2))

    px_m, py_m = px * lat_scale, py * lon_scale
    ax_m, ay_m = ax * lat_scale, ay * lon_scale
    bx_m, by_m = bx * lat_scale, by * lon_scale

    dx = bx_m - ax_m
    dy = by_m - ay_m

    if dx == 0 and dy == 0:
        return math.sqrt((px_m - ax_m) ** 2 + (py_m - ay_m) ** 2)

    t = ((px_m - ax_m) * dx + (py_m - ay_m) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))

    proj_x = ax_m + t * dx
    proj_y = ay_m + t * dy

    return math.sqrt((px_m - proj_x) ** 2 + (py_m - proj_y) ** 2)


def _is_forward_along_corridor(
    p_lat: float, p_lon: float,
    corridor_points: List[Tuple[float, float]],
    from_idx: int,
) -> bool:
    """Check that the place lies forward (not behind) the current position
    along the corridor. Uses the nearest segment index to determine if the
    place's projection is ahead of the current travel point.

    Args:
        p_lat, p_lon: Place coordinates
        corridor_points: Ordered (lat, lon) points defining the corridor
        from_idx: Index in corridor_points representing current position

    Returns:
        True if place is forward (i.e. not backtracking)
    """
    if not corridor_points or from_idx >= len(corridor_points) - 1:
        return True

    _, nearest_seg = _project_onto_corridor(p_lat, p_lon, corridor_points)

    # If nearest segment is at or ahead of current position → forward
    return nearest_seg >= from_idx


def get_corridor_district_centroids(corridor: List[str], place_pool: List[Dict]) -> List[Tuple[float, float]]:
    """Build an ordered list of (lat, lon) centroids for districts in the corridor.

    Falls back to first available place coordinates in each district.
    """
    centroids = []
    for district in corridor:
        dn = district.lower().strip()
        district_places = [
            p for p in place_pool
            if (p.get("district") or "").lower().strip() == dn
        ]
        if district_places:
            lat = district_places[0].get("latitude")
            lon = district_places[0].get("longitude")
            if lat is not None and lon is not None:
                centroids.append((lat, lon))
                continue
        # No place in this district — skip (will use interpolation)
        centroids.append(None)

    # Fill gaps by linear interpolation
    filled = []
    last_valid = None
    for i, c in enumerate(centroids):
        if c is not None:
            last_valid = c
            filled.append(c)
        else:
            # Look ahead for next valid
            next_valid = None
            for j in range(i + 1, len(centroids)):
                if centroids[j] is not None:
                    next_valid = centroids[j]
                    break
            if last_valid and next_valid:
                frac = 0.5  # midpoint
                avg_lat = last_valid[0] + (next_valid[0] - last_valid[0]) * frac
                avg_lon = last_valid[1] + (next_valid[1] - last_valid[1]) * frac
                filled.append((avg_lat, avg_lon))
            elif last_valid:
                filled.append(last_valid)
            elif next_valid:
                filled.append(next_valid)
            else:
                filled.append((27.7, 85.3))  # Default Nepal center

    return filled


def is_suitable_transit_place(
    place: Dict,
    from_district: str,
    to_district: str,
    from_coords: tuple,
    to_coords: tuple,
    transport_mode: str = "Private Car / Local Bus",
    corridor_points: Optional[List[Tuple[float, float]]] = None,
    from_idx: int = 0,
) -> Tuple[bool, str]:
    """Check if a place is suitable as a transit stopover.

    Args:
        place: Place dict with latitude, longitude, category, duration_hours, etc.
        from_district: District name we're travelling from.
        to_district: District name we're travelling to.
        from_coords: (lat, lon) of starting point.
        to_coords: (lat, lon) of destination point.
        transport_mode: How the user is travelling.
        corridor_points: Ordered (lat, lon) points defining the road corridor.
        from_idx: Current position index in corridor_points.

    Returns:
        (True, "") if suitable, or (False, reason_string) if rejected.
    """
    p_lat = place.get("latitude")
    p_lon = place.get("longitude")
    if p_lat is None or p_lon is None:
        return False, "missing coordinates"

    # Must not be a trek
    cat = (place.get("category") or "").lower()
    if "trek" in cat or place.get("is_trek"):
        return False, "is a trek"

    # Visit duration must be short
    duration = float(place.get("duration_hours", 2.0))
    if duration > TRANSIT_CONFIG["max_visit_hours"]:
        return False, f"duration {duration}h exceeds max {TRANSIT_CONFIG['max_visit_hours']}h"

    # Determine detour threshold based on transport mode
    mode_lower = transport_mode.lower() if transport_mode else ""
    is_bus = mode_lower.startswith("tourist bus") or mode_lower.startswith("micro") or "bus only" in mode_lower
    max_detour = TRANSIT_CONFIG["max_bus_detour_km"] if is_bus else TRANSIT_CONFIG["max_detour_km"]
    reject_threshold = TRANSIT_CONFIG["bus_reject_threshold_km"] if is_bus else TRANSIT_CONFIG["detour_reject_threshold_km"]

    # Check distance from road corridor
    if corridor_points and len(corridor_points) >= 2:
        detour_km, nearest_seg = _project_onto_corridor(p_lat, p_lon, corridor_points)

        if detour_km > reject_threshold:
            mode_label = "bus" if is_bus else "vehicle"
            return False, f"detour {detour_km:.1f}km exceeds {mode_label} reject threshold {reject_threshold}km"

        if detour_km > max_detour:
            mode_label = "bus" if is_bus else "vehicle"
            return False, f"detour {detour_km:.1f}km exceeds {mode_label} max {max_detour}km"

        # Check forward movement (no backtracking)
        if not _is_forward_along_corridor(p_lat, p_lon, corridor_points, from_idx):
            return False, "backtracking (behind current position along corridor)"
    else:
        # Fallback: use midpoint distance check (original behavior)
        from_lat, from_lon = from_coords
        to_lat, to_lon = to_coords
        mid_lat = (from_lat + to_lat) / 2
        mid_lon = (from_lon + to_lon) / 2
        detour_km = distance_km(mid_lat, mid_lon, p_lat, p_lon)

        if detour_km > reject_threshold:
            return False, f"detour {detour_km:.1f}km exceeds reject threshold {reject_threshold}km"

    return True, ""


def score_transit_place(
    place: Dict,
    from_coords: tuple,
    to_coords: tuple,
    transport_mode: str = "Private Car / Local Bus",
    corridor_points: Optional[List[Tuple[float, float]]] = None,
    from_idx: int = 0,
) -> float:
    """Score a transit-eligible place using the corridor-constrained formula.

    Final Score =
        Category Score (0-10)
        + Popularity (0-10)
        + Route Continuity (0-10)
        - Detour Distance (weighted)
        - Travel Time Penalty (weighted)
        - Backtracking Penalty (heavy if applicable)

    Higher score = better transit stop.

    Args:
        place: Place dict with category, review_score, duration_hours, etc.
        from_coords: (lat, lon) of starting point.
        to_coords: (lat, lon) of destination point.
        transport_mode: How the user is travelling.
        corridor_points: Ordered (lat, lon) points defining the road corridor.
        from_idx: Current position index in corridor_points.

    Returns:
        Float score (higher = better). Returns -999 if place should be rejected.
    """
    p_lat = place.get("latitude")
    p_lon = place.get("longitude")

    # 1. Category Score (0-10)
    cat = (place.get("category") or "").lower()
    cat_scores = {
        "religious": 7, "temple": 7, "stupa": 7,
        "cultural": 8, "museum": 8,
        "nature": 6, "viewpoint": 6, "scenic": 6,
        "adventure": 5,
        "market": 4, "food": 3,
        "other": 2,
    }
    category_score = 0
    for key, score in cat_scores.items():
        if key in cat:
            category_score = max(category_score, score)
    if category_score == 0:
        category_score = 2

    # 2. Popularity (0-10)
    popularity = float(place.get("review_score", place.get("similarity_score", 0.5)))
    popularity_score = popularity * 10

    # 3. Route Continuity (0-10) — closer to corridor = higher
    route_continuity_score = 5.0  # default mid
    detour_km = 0.0

    if corridor_points and len(corridor_points) >= 2:
        detour_km, nearest_seg = _project_onto_corridor(p_lat, p_lon, corridor_points)
        # Closer = higher: 10 - (detour / max_detour * 10), clamped
        max_detour = get_transit_config("max_detour_km", 10.0)
        route_continuity_score = max(0, 10.0 - (detour_km / max_detour) * 10.0)
    else:
        from_lat, from_lon = from_coords
        to_lat, to_lon = to_coords
        mid_lat = (from_lat + to_lat) / 2
        mid_lon = (from_lon + to_lon) / 2
        detour_km = distance_km(mid_lat, mid_lon, p_lat, p_lon)
        route_continuity_score = max(0, 10.0 - (detour_km / get_transit_config("max_detour_km", 10.0)) * 10.0)

    # 4. Detour Distance Penalty (weighted negative)
    detour_penalty = detour_km * get_transit_config("detour_penalty_weight", 0.4)

    # 5. Travel Time Penalty — longer visits penalized
    duration = float(place.get("duration_hours", 2.0))
    travel_time_penalty = (duration / get_transit_config("max_visit_hours", 2.0)) * get_transit_config("travel_time_penalty_weight", 0.2) * 10

    # 6. Backtracking Penalty
    backtrack_penalty = 0.0
    if corridor_points and len(corridor_points) >= 2:
        if not _is_forward_along_corridor(p_lat, p_lon, corridor_points, from_idx):
            backtrack_penalty = get_transit_config("backtrack_penalty_weight", 0.5) * 100

    # Transport mode penalty: bus places get slight penalty for being less flexible
    mode_lower = transport_mode.lower() if transport_mode else ""
    is_bus = mode_lower.startswith("tourist bus") or mode_lower.startswith("micro")
    mode_penalty = 2.0 if is_bus else 0.0

    final_score = (
        category_score
        + popularity_score
        + route_continuity_score
        - detour_penalty
        - travel_time_penalty
        - backtrack_penalty
        - mode_penalty
    )

    return final_score


def pick_transit_place(
    places: List[Dict],
    from_district: str,
    to_district: str,
    from_coords: tuple,
    to_coords: tuple,
    transit_district: Optional[str] = None,
    transport_mode: str = "Private Car / Local Bus",
    corridor_points: Optional[List[Tuple[float, float]]] = None,
    from_idx: int = 0,
) -> Optional[Dict]:
    """Pick the best transit stopover place from a pool.

    Args:
        places: Pool of candidate places (already district-filtered).
        from_district: Starting district of the transit segment.
        to_district: Ending district of the transit segment.
        from_coords: (lat, lon) of starting point.
        to_coords: (lat, lon) of ending point.
        transit_district: If set, filter to places from this district only.
        transport_mode: How the user is travelling.
        corridor_points: Ordered (lat, lon) points defining the road corridor.
        from_idx: Current position index in corridor_points.

    Returns:
        Best transit-eligible place, or None if none suitable.
    """
    candidates = []
    for p in places:
        p_dist = (p.get("district") or "").lower().strip()
        if transit_district and p_dist != transit_district.lower().strip():
            continue

        suitable, reason = is_suitable_transit_place(
            p, from_district, to_district,
            from_coords, to_coords,
            transport_mode=transport_mode,
            corridor_points=corridor_points,
            from_idx=from_idx,
        )
        if not suitable:
            continue

        score = score_transit_place(
            p, from_coords, to_coords,
            transport_mode=transport_mode,
            corridor_points=corridor_points,
            from_idx=from_idx,
        )
        candidates.append((score, p))

    if not candidates:
        return None

    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]
