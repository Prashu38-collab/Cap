"""
Phase 3.1: Multi-District Transit Corridor + Travel Fatigue Logic

Determines the route corridor between starting and ending districts,
allocates days across districts, and applies travel fatigue limits.
"""

from collections import deque

DISTRICT_GRAPH = {
    "Kathmandu": ["Lalitpur", "Bhaktapur", "Nuwakot", "Kavrepalanchowk", "Chitwan"],
    "Lalitpur": ["Kathmandu", "Bhaktapur"],
    "Bhaktapur": ["Kathmandu", "Lalitpur", "Kavrepalanchowk"],
    "Kavrepalanchowk": ["Kathmandu", "Bhaktapur", "Sindhupalchowk", "Dolakha"],
    "Nuwakot": ["Kathmandu", "Rasuwa"],
    "Rasuwa": ["Nuwakot", "Sindhupalchowk"],
    "Sindhupalchowk": ["Kavrepalanchowk", "Dolakha", "Rasuwa"],
    "Dolakha": ["Kavrepalanchowk", "Sindhupalchowk", "Sindhuli"],
    "Chitwan": ["Kathmandu", "Nuwakot"],
    "Sindhuli": ["Dolakha", "Kavrepalanchowk"],
}


DISTRICT_ALIASES = {
    "Kavrepalanchok": "Kavrepalanchowk",
    "Sindhupalchok": "Sindhupalchowk",
}


def _normalize(name: str) -> str:
    """Normalize district name, handling common spelling variations."""
    n = name.strip().title()
    return DISTRICT_ALIASES.get(n, n)


def compute_corridor(starting_district: str, ending_district: str) -> list:
    """Compute shortest path corridor between two districts using BFS.

    Returns ordered list of district names from start to end.
    """
    start = _normalize(starting_district)
    end = _normalize(ending_district)

    if start == end:
        return [start]

    visited = {start}
    queue = deque([[start]])

    while queue:
        path = queue.popleft()
        node = path[-1]

        if node == end:
            return path

        for neighbor in DISTRICT_GRAPH.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                new_path = list(path)
                new_path.append(neighbor)
                queue.append(new_path)

    return [start, end]


def allocate_days_to_districts(corridor: list, travel_days: int) -> list:
    """Allocate travel days to districts along the corridor.

    Returns list of (day_number, district) tuples (1-indexed).
    """
    num_districts = len(corridor)

    if travel_days <= 1:
        return [(1, corridor[0])]

    if travel_days == 2:
        return [(1, corridor[0]), (2, corridor[-1])]

    if travel_days >= num_districts:
        allocation = [(i + 1, corridor[i]) for i in range(num_districts)]
        extra = travel_days - num_districts
        if extra > 0:
            last_day = allocation[-1][0]
            for i in range(extra):
                allocation.append((last_day + i + 1, corridor[-1]))
        return allocation

    # More districts than days: keep first, last, nearest intermediates
    selected = [corridor[0]]
    intermediates = corridor[1:-1]
    slots_needed = travel_days - 2
    selected += intermediates[:max(0, slots_needed)]
    selected.append(corridor[-1])

    return [(i + 1, selected[i]) for i in range(len(selected))]


def get_travel_fatigue_limits(day_num: int, mobility: str) -> int:
    """Max places per day based on travel fatigue accumulated over trip days.

    Easy:   3 places (d1-2), 2 (d3-4), 1 (d5+)
    Moderate: 3 (d1), 2 (d2-3), 1 (d4+)
    Difficult: 2 (d1-2), 1 (d3+)
    """
    mob = mobility.lower().strip() if mobility else "moderate"

    if mob == "easy":
        if day_num <= 2:
            return 3
        if day_num <= 4:
            return 2
        return 1

    if mob == "difficult":
        if day_num <= 2:
            return 2
        return 1

    if day_num == 1:
        return 3
    if day_num <= 3:
        return 2
    return 1
