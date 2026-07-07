"""
Category relaxation priority system.

When a user's preferred categories are exhausted, this module
provides an ordered fallback through progressively broader
category groupings so no itinerary day is left empty.

Priority order:
    1. User preferred categories (e.g., Religious)
    2. Nature / Scenic
    3. Cultural / Museum / Heritage
    4. Adventure / Trek
    5. Popular attractions (highest rated overall)
    6. Hidden gems / Other (lowest bar, everything eligible)

Each level has a score multiplier so preferred categories
always rank higher when available.
"""

from typing import List, Optional, Dict, Any

# ──────────────────────────────────────────────
# CATEGORY RELAXATION PRIORITY
# Ordered list of (name, keywords, score_multiplier)
# ──────────────────────────────────────────────
CATEGORY_GROUPS = [
    # Level 0: Preferred (handled separately — full 1.0 weight)
    ("preferred", [], 1.0),

    # Level 1: Nature & Scenic
    ("nature", ["nature", "scenic", "viewpoint", "garden", "lake", "mountain", "park", "forest"], 0.85),

    # Level 2: Cultural / Heritage
    ("cultural", ["cultural", "museum", "heritage", "monument", "historical", "gallery", "exhibition"], 0.70),

    # Level 3: Adventure / Activity
    ("adventure", ["adventure", "trek", "hiking", "rafting", "biking", "climbing", "paragliding"], 0.55),

    # Level 4: Popular attractions (high-rated, any category)
    ("popular", [], 0.40),

    # Level 5: Everything else (hidden gems, other)
    ("other", [], 0.25),
]


def get_relaxed_categories(preferred_categories: Optional[List[str]] = None) -> List[Dict]:
    """Build the ordered category relaxation list.

    Args:
        preferred_categories: User's selected category preferences.

    Returns:
        List of dicts with 'name', 'keywords', 'score_multiplier', and 'is_active'.
        Preferred categories are always first; remaining groups follow in priority order.
    """
    if preferred_categories is None:
        preferred_categories = []

    # Start with preferred categories as level 0 (score_multiplier 1.0)
    relaxed = [
        {
            "name": "preferred",
            "keywords": [c.lower().strip() for c in preferred_categories if c],
            "score_multiplier": 1.0,
            "is_preferred": True,
        }
    ]

    # Append remaining category groups
    for name, keywords, mult in CATEGORY_GROUPS:
        if name == "preferred":
            continue  # Already added above
        relaxed.append({
            "name": name,
            "keywords": keywords,
            "score_multiplier": mult,
            "is_preferred": False,
        })

    return relaxed


def categorize_place(place_cat: str, relaxed_categories: List[Dict]) -> int:
    """Determine which relaxation level a place belongs to.

    Args:
        place_cat: The place's category string.
        relaxed_categories: Output from get_relaxed_categories().

    Returns:
        Index into relaxed_categories (0 = preferred, higher = more relaxed).
        Returns len(relaxed_categories)-1 if no group matches.
    """
    if not place_cat:
        return len(relaxed_categories) - 1

    pc = place_cat.lower().strip()

    for i, group in enumerate(relaxed_categories):
        if group["is_preferred"]:
            # Check if place matches ANY preferred category
            if any(kw in pc for kw in group["keywords"]):
                return i
        else:
            # Check if place matches group keywords
            if any(kw in pc for kw in group["keywords"]):
                return i
            # For level 4 "popular" and level 5 "other" — always match
            if group["name"] in ("popular", "other"):
                return i

    return len(relaxed_categories) - 1


def score_with_relaxation(
    place_cat: str,
    base_score: float,
    preferred_categories: Optional[List[str]] = None,
) -> float:
    """Apply category relaxation scoring to a place.

    Preferred categories keep their full base_score.
    Each relaxation level applies a decreasing multiplier.
    """
    relaxed = get_relaxed_categories(preferred_categories)
    level = categorize_place(place_cat, relaxed)
    multiplier = relaxed[min(level, len(relaxed) - 1)]["score_multiplier"]
    return base_score * multiplier


def get_active_levels(preferred_categories: Optional[List[str]] = None) -> List[str]:
    """Return the ordered list of category group names for logging/debugging."""
    relaxed = get_relaxed_categories(preferred_categories)
    return [g["name"] for g in relaxed]
