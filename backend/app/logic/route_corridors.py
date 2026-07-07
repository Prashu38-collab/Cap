"""
Predefined transit corridors for all supported district pairs.

Each corridor defines the road route taken between starting and
destination districts. These are manually curated to reflect
real highway routes in Bagmati Province.

Usage:
    corridor = get_corridor("Kathmandu", "Dolakha")
    # Returns ["Kathmandu", "Sindhupalchowk", "Dolakha"]
"""

from typing import Optional

# ──────────────────────────────────────────────
# PREDEFINED TRANSIT CORRIDORS
# Keyed by (start_normalized, end_normalized)
# Value is the ordered list of districts along the route.
# ──────────────────────────────────────────────
PREDEFINED_CORRIDORS = {
    # Valley → Eastern
    ("Kathmandu", "Dolakha"): ["Kathmandu", "Sindhupalchowk", "Dolakha"],
    ("Kathmandu", "Kavrepalanchowk"): ["Kathmandu", "Bhaktapur", "Kavrepalanchowk"],
    ("Kathmandu", "Sindhuli"): ["Kathmandu", "Kavrepalanchowk", "Sindhuli"],

    # Valley → Northern
    ("Kathmandu", "Nuwakot"): ["Kathmandu", "Nuwakot"],
    ("Kathmandu", "Rasuwa"): ["Kathmandu", "Nuwakot", "Rasuwa"],

    # Valley → Western
    ("Kathmandu", "Chitwan"): ["Kathmandu", "Chitwan"],

    # Reverse routes (same path, opposite direction)
    ("Dolakha", "Kathmandu"): ["Dolakha", "Sindhupalchowk", "Kathmandu"],
    ("Kavrepalanchowk", "Kathmandu"): ["Kavrepalanchowk", "Bhaktapur", "Kathmandu"],
    ("Sindhuli", "Kathmandu"): ["Sindhuli", "Kavrepalanchowk", "Kathmandu"],
    ("Nuwakot", "Kathmandu"): ["Nuwakot", "Kathmandu"],
    ("Rasuwa", "Kathmandu"): ["Rasuwa", "Nuwakot", "Kathmandu"],
    ("Chitwan", "Kathmandu"): ["Chitwan", "Kathmandu"],

    # Far-east connections
    ("Dolakha", "Sindhuli"): ["Dolakha", "Sindhuli"],
    ("Sindhuli", "Dolakha"): ["Sindhuli", "Dolakha"],
    ("Kavrepalanchowk", "Dolakha"): ["Kavrepalanchowk", "Sindhupalchowk", "Dolakha"],
    ("Dolakha", "Kavrepalanchowk"): ["Dolakha", "Sindhupalchowk", "Kavrepalanchowk"],
    ("Kavrepalanchowk", "Sindhuli"): ["Kavrepalanchowk", "Sindhuli"],
    ("Sindhuli", "Kavrepalanchowk"): ["Sindhuli", "Kavrepalanchowk"],

    # Northern connections
    ("Nuwakot", "Rasuwa"): ["Nuwakot", "Rasuwa"],
    ("Rasuwa", "Nuwakot"): ["Rasuwa", "Nuwakot"],
    ("Sindhupalchowk", "Dolakha"): ["Sindhupalchowk", "Dolakha"],
    ("Dolakha", "Sindhupalchowk"): ["Dolakha", "Sindhupalchowk"],

    # Valley cluster internal (short hops — direct)
    ("Kathmandu", "Lalitpur"): ["Kathmandu", "Lalitpur"],
    ("Lalitpur", "Kathmandu"): ["Lalitpur", "Kathmandu"],
    ("Kathmandu", "Bhaktapur"): ["Kathmandu", "Bhaktapur"],
    ("Bhaktapur", "Kathmandu"): ["Bhaktapur", "Kathmandu"],
    ("Lalitpur", "Bhaktapur"): ["Lalitpur", "Bhaktapur"],
    ("Bhaktapur", "Lalitpur"): ["Bhaktapur", "Lalitpur"],
    ("Sindhupalchowk", "Kathmandu"): ["Sindhupalchowk", "Kathmandu"],
    ("Kathmandu", "Sindhupalchowk"): ["Kathmandu", "Sindhupalchowk"],
}

# Aliases for district name variants
CORRIDOR_ALIASES = {
    "Kavrepalanchok": "Kavrepalanchowk",
    "Sindhupalchok": "Sindhupalchowk",
}


def _normalize_corridor(name: str) -> str:
    """Normalize district name for corridor lookup."""
    n = name.strip().title()
    return CORRIDOR_ALIASES.get(n, n)


def get_corridor(start: str, end: str) -> Optional[list]:
    """Look up a predefined corridor for the given start→end pair.

    Returns the corridor list if found, or None if no predefined route exists.
    """
    key = (_normalize_corridor(start), _normalize_corridor(end))
    return PREDEFINED_CORRIDORS.get(key)


def get_transit_districts(corridor: list) -> list:
    """Return intermediate districts (between start and destination) in a corridor.

    Example:
        corridor = ["Kathmandu", "Sindhupalchowk", "Dolakha"]
        returns ["Sindhupalchowk"]
    """
    if len(corridor) <= 2:
        return []
    return corridor[1:-1]


def get_last_transit_district(corridor: list) -> Optional[str]:
    """Return the last intermediate district before the destination.

    This is the most suitable district for a transit stopover.
    """
    transit = get_transit_districts(corridor)
    return transit[-1] if transit else None


def iter_corridor_segments(corridor: list):
    """Yield (from_district, to_district) pairs for each segment of the corridor."""
    for i in range(len(corridor) - 1):
        yield corridor[i], corridor[i + 1]
