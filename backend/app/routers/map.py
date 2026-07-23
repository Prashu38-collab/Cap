from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(
    prefix="/map",
    tags=["Map"]
)


class RouteRequest(BaseModel):
    coordinates: List[List[float]]  # [[lat, lon], [lat, lon], ...]


class SegmentRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float


@router.get("/")
def get_map():
    return {"message": "Map module working"}


@router.post("/route")
def get_route(payload: RouteRequest):
    """Get OSRM road route geometry for a list of coordinates.

    Request body:
        { "coordinates": [[lat1, lon1], [lat2, lon2], ...] }

    Returns:
        { "geometry": <GeoJSON>, "distance_km": float, "duration_min": float,
          "segments": [{distance_km, duration_min, geometry}, ...] }
    """
    try:
        from app.services.osrm_service import get_road_route

        waypoints = [{"latitude": c[0], "longitude": c[1]} for c in payload.coordinates]
        segments = get_road_route(waypoints)

        if segments:
            total_distance = sum(s["distance_km"] for s in segments)
            total_duration = sum(s["duration_min"] for s in segments)
            # Use the geometry from the first segment (OSRM returns full route geometry)
            geometry = segments[0].get("geometry") if segments else None
            return {
                "status": "ok",
                "distance_km": round(total_distance, 2),
                "duration_min": round(total_duration, 1),
                "geometry": geometry,
                "segments": segments,
            }
        else:
            return {
                "status": "fallback",
                "distance_km": 0,
                "duration_min": 0,
                "geometry": None,
                "segments": [],
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "distance_km": 0,
            "duration_min": 0,
            "geometry": None,
            "segments": [],
        }


@router.post("/segment")
def get_segment(payload: SegmentRequest):
    """Get OSRM road route for a single segment (two points)."""
    try:
        from app.services.osrm_service import get_road_distance

        result = get_road_distance(
            payload.origin_lat, payload.origin_lon,
            payload.dest_lat, payload.dest_lon,
        )
        if result:
            return {
                "status": "ok",
                "distance_km": result["distance_km"],
                "duration_min": result["duration_min"],
                "geometry": result.get("geometry"),
            }
        else:
            return {"status": "fallback", "distance_km": 0, "duration_min": 0, "geometry": None}
    except Exception as e:
        return {"status": "error", "message": str(e), "distance_km": 0, "duration_min": 0, "geometry": None}
