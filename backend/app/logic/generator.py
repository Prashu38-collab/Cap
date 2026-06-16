from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import math
from collections import defaultdict

# ----------------------------
# Helper: Haversine distance
# ----------------------------
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# ----------------------------
# Simple clustering (distance-based greedy)
# (You can replace with DBSCAN later)
# ----------------------------
def cluster_places(places: List[dict], max_distance_km: float = 3.0):
    clusters = []

    for place in places:
        placed = False

        for cluster in clusters:
            # compare with first point in cluster
            base = cluster[0]
            dist = haversine(
                place["lat"], place["lng"],
                base["lat"], base["lng"]
            )

            if dist <= max_distance_km:
                cluster.append(place)
                placed = True
                break

        if not placed:
            clusters.append([place])

    return clusters


# ----------------------------
# Assign nearest hotel to cluster
# ----------------------------
def assign_hotel_to_cluster(cluster, hotels):
    def cluster_center(cluster):
        lat = sum(p["lat"] for p in cluster) / len(cluster)
        lng = sum(p["lng"] for p in cluster) / len(cluster)
        return lat, lng

    c_lat, c_lng = cluster_center(cluster)

    best_hotel = None
    best_dist = float("inf")

    for h in hotels:
        dist = haversine(c_lat, c_lng, h["lat"], h["lng"])
        if dist < best_dist:
            best_dist = dist
            best_hotel = h

    return best_hotel


# ----------------------------
# Route optimization (simple greedy TSP)
# ----------------------------
def optimize_route(places: List[dict]):
    if not places:
        return []

    remaining = places[:]
    route = [remaining.pop(0)]

    while remaining:
        last = route[-1]
        next_place = min(
            remaining,
            key=lambda p: haversine(last["lat"], last["lng"], p["lat"], p["lng"])
        )
        route.append(next_place)
        remaining.remove(next_place)

    return route


# ----------------------------
# MAIN ITINERARY GENERATOR
# ----------------------------
def generate_itinerary(
    db: Session,
    preference_id: int,
    places: List[dict],
    hotels: List[dict],
    planning_mode: str,   # "user_anchor" | "system_anchor"
    selected_hotel_id: Optional[int] = None
):

    # ----------------------------
    # STEP 1: Decide hotel mode
    # ----------------------------
    if planning_mode == "user_anchor":
        hotel = next((h for h in hotels if h["hotel_id"] == selected_hotel_id), None)
        if not hotel:
            raise Exception("Selected hotel not found")

    else:
        # system chooses best hotel later (temporary anchor = None)
        hotel = None


    # ----------------------------
    # STEP 2: Cluster places
    # ----------------------------
    clusters = cluster_places(places)


    # ----------------------------
    # STEP 3: Build day-wise plan
    # ----------------------------
    itinerary = []
    day = 1

    for cluster in clusters:

        # assign hotel (system mode: pick per cluster)
        cluster_hotel = hotel
        if planning_mode == "system_anchor":
            cluster_hotel = assign_hotel_to_cluster(cluster, hotels)

        # compute distances from hotel (if exists)
        for p in cluster:
            if cluster_hotel:
                p["distance_from_hotel"] = haversine(
                    p["lat"], p["lng"],
                    cluster_hotel["lat"], cluster_hotel["lng"]
                )

        # sort by proximity to hotel
        cluster_sorted = sorted(
            cluster,
            key=lambda x: x.get("distance_from_hotel", 0)
        )

        # route optimization inside day
        ordered_route = optimize_route(cluster_sorted)

        itinerary.append({
            "day": day,
            "hotel": cluster_hotel,
            "places": ordered_route
        })

        day += 1

    # ----------------------------
    # STEP 4: Return structured output
    # ----------------------------
    return {
        "preference_id": preference_id,
        "planning_mode": planning_mode,
        "days": len(itinerary),
        "itinerary": itinerary
    }