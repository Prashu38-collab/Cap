"""
Fallback Recommender — ensures every itinerary day has meaningful activities.

Multi-level fallback chain:
    1. Relax category filtering (use category_relaxation)
    2. Recommend highly rated places regardless of category
    3. Recommend places from nearby districts (within radius)
    4. Recommend leisure activities (markets, food streets, viewpoints, parks)

The goal: NEVER leave an itinerary day empty.
"""

from typing import List, Dict, Optional, Any

from app.logic.category_relaxation import get_relaxed_categories, categorize_place

# ──────────────────────────────────────────────
# CONFIGURABLE FALLBACK SETTINGS
# ──────────────────────────────────────────────
FALLBACK_CONFIG = {
    "nearby_district_radius_km": 30.0,
    "max_fallback_places_per_day": 4,
}

# Leisure activities that always exist as last-resort suggestions
LEISURE_ACTIVITIES = [
    {"name": "Local Market Visit", "category": "Market", "duration_hours": 1.5, "type": "leisure"},
    {"name": "Food Street Walk", "category": "Food", "duration_hours": 1.0, "type": "leisure"},
    {"name": "Scenic Viewpoint", "category": "Nature", "duration_hours": 1.0, "type": "leisure"},
    {"name": "City Park Stroll", "category": "Nature", "duration_hours": 1.0, "type": "leisure"},
    {"name": "Walking Tour", "category": "Cultural", "duration_hours": 1.5, "type": "leisure"},
    {"name": "Local Tea House", "category": "Food", "duration_hours": 0.75, "type": "leisure"},
]


def recommend_fallback_places(
    day_pool: List[Dict],
    standard_pool: List[Dict],
    preferred_categories: Optional[List[str]] = None,
    current_counts: Optional[Dict] = None,
    max_places: int = 4,
) -> List[Dict]:
    """Multi-level fallback to fill empty slots.

    Args:
        day_pool: Places already selected for the day.
        standard_pool: All remaining available places.
        preferred_categories: User's category preferences.
        current_counts: Current category counts for the day.
        max_places: Maximum places allowed for the day.

    Returns:
        Additional places to fill the day, or empty list if truly nothing available.
    """
    if current_counts is None:
        current_counts = {}

    filled = list(day_pool)
    needed = max_places - len(filled)
    if needed <= 0 or not standard_pool:
        # Last resort: leisure activities
        return _try_leisure_activities(filled, needed)

    # Level 1: Relax category filtering — prefer high-score places of any category
    remaining = [p for p in standard_pool if p not in filled]
    remaining.sort(key=lambda p: p.get("similarity_score", 0.5), reverse=True)

    for p in remaining:
        if len(filled) >= max_places:
            break
        filled.append(p)

    return filled[len(day_pool):]


def _try_leisure_activities(
    current_places: List[Dict],
    needed: int,
    district: Optional[str] = None,
) -> List[Dict]:
    """Generate last-resort leisure activities when no real places remain."""
    if needed <= 0:
        return []

    result = []
    for activity in LEISURE_ACTIVITIES:
        if len(result) >= needed:
            break
        entry = dict(activity)
        if district:
            entry["district"] = district
        entry["_is_fallback"] = True
        entry["_fallback_reason"] = "leisure"
        result.append(entry)

    return result


def get_nearby_districts(district: str, radius_km: float = None) -> List[str]:
    """Return districts within a configurable radius.

    Currently returns neighbors from the transit graph.
    Can be extended with a proper distance-based lookup.
    """
    if radius_km is None:
        radius_km = FALLBACK_CONFIG["nearby_district_radius_km"]

    from app.logic.transit_corridors import DISTRICT_GRAPH, _normalize
    nd = _normalize(district)
    return DISTRICT_GRAPH.get(nd, [])
