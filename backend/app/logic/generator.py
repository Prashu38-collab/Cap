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


def cluster_places_by_proximity(places: List[dict], max_distance_km: float = 5.0):
    clusters = []
    for place in places:
        placed = False
        for cluster in clusters:
            base = cluster[0]
            dist = haversine(
                place["latitude"], place["longitude"],
                base["latitude"], base["longitude"]
            )
            if dist <= max_distance_km:
                cluster.append(place)
                placed = True
                break
        if not placed:
            clusters.append([place])
    return clusters


def assign_nearest_hotel(cluster, hotels):
    if not hotels:
        return None
    c_lat = sum(p["latitude"] for p in cluster) / len(cluster)
    c_lon = sum(p["longitude"] for p in cluster) / len(cluster)
    return min(hotels, key=lambda h: haversine(c_lat, c_lon, h["latitude"], h["longitude"]))


def optimize_route(places: List[dict], hotel: dict):
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
):
    if not places:
        raise Exception("No places available to generate itinerary")

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

    if not normal_places:
        raise Exception("No non-trek places found for itinerary")

    # Sort all places by distance from hotel
    for p in normal_places:
        p["_dist"] = haversine(
            anchor_hotel["latitude"], anchor_hotel["longitude"],
            p["latitude"], p["longitude"]
        )
    normal_places.sort(key=lambda x: x["_dist"])

    # Distribute places across days
    # Day 1 and last day get fewer places, middle days get more
    itinerary = []

    if travel_days == 1:
        day_allocations = [min(len(normal_places), 4)]
    elif travel_days == 2:
        day_allocations = [2, min(len(normal_places) - 2, 3)]
    else:
        day_allocations = []
        day_allocations.append(2)  # day 1 fewer places
        remaining_days = travel_days - 2
        middle_places = len(normal_places) - 2
        per_middle_day = min(4, max(2, middle_places // max(remaining_days, 1)))
        for _ in range(remaining_days):
            day_allocations.append(per_middle_day)
        day_allocations.append(min(2, len(normal_places)))  # last day fewer

    used_indices = []
    place_pool = list(range(len(normal_places)))

    for day_num in range(1, travel_days + 1):
        if day_num <= len(day_allocations):
            count = day_allocations[day_num - 1]
        else:
            count = 2

        # Pick next available places
        day_place_indices = []
        for idx in place_pool:
            if idx not in used_indices:
                day_place_indices.append(idx)
                if len(day_place_indices) >= count:
                    break

        day_places = [normal_places[i] for i in day_place_indices]
        used_indices.extend(day_place_indices)

        # Optimize route within the day
        ordered = optimize_route(day_places, anchor_hotel)

        # Add distance from hotel info
        for p in ordered:
            p["distance_from_hotel_km"] = round(p["_dist"], 2)

        itinerary.append({
            "day": day_num,
            "hotel": {
                "hotel_id": anchor_hotel["hotel_id"],
                "hotel_name": anchor_hotel["hotel_name"],
                "latitude": anchor_hotel["latitude"],
                "longitude": anchor_hotel["longitude"],
            },
            "places": ordered,
            "total_places": len(ordered)
        })

    return {
        "preference_id": preference_id,
        "planning_mode": planning_mode,
        "days": travel_days,
        "itinerary": itinerary
    }