from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from .weather_service import WeatherService, FORECAST_WINDOW_DAYS
from .weather_rules import is_favourable, condition_label


def check_weather_advisory(
    db: Session,
    districts: list[str],
    travel_date_str: str,
) -> dict:
    """Check weather and return advisory info without modifying anything.

    Returns:
        dict with:
          - status: "favourable" | "unfavourable" | "outside_forecast" | "unavailable"
          - weather_checked: bool
          - forecasts: list of forecast dicts per district
          - advisory: dict or None (if unfavourable)
          - indoor_alternatives_available: bool (whether any district has indoor places)
    """
    service = WeatherService()

    if not travel_date_str:
        return {"status": "unavailable", "weather_checked": False,
                "forecasts": [], "advisory": None,
                "indoor_alternatives_available": False,
                "district_indoor_info": []}

    if not service.is_within_forecast_window(travel_date_str):
        return {
            "status": "outside_forecast",
            "weather_checked": True,
            "forecasts": [],
            "advisory": {
                "title": "Weather Information",
                "message": (
                    f"Weather forecasts are only available for the next "
                    f"{FORECAST_WINDOW_DAYS} days. Your itinerary has been "
                    f"generated normally. Please check the weather closer to "
                    f"your departure date."
                ),
            },
            "indoor_alternatives_available": False,
            "district_indoor_info": [],
        }

    forecasts = service.get_forecasts_for_districts(districts, travel_date_str)
    forecast_list = []
    any_unfavourable = False
    worst_label = "Unknown"

    for district, f in forecasts.items():
        d = f.to_dict() if f else {"district": district, "weather_code": 0}
        forecast_list.append(d)
        if f and not is_favourable(f):
            any_unfavourable = True
            worst_label = condition_label(f)

    if not any_unfavourable:
        return {
            "status": "favourable",
            "weather_checked": True,
            "forecasts": forecast_list,
            "advisory": None,
            "indoor_alternatives_available": False,
            "district_indoor_info": [],
        }

    # Check indoor availability per district
    has_indoor = False
    district_indoor_info = []
    for district in districts:
        count = _count_indoor_places(db, district)
        available = count > 0
        if available:
            has_indoor = True
        district_indoor_info.append({
            "district": district,
            "indoor_available": available,
            "message": (
                f"No indoor places available in {district}. "
                f"This district is mainly for outdoor activities."
            ) if not available else None,
        })

    return {
        "status": "unfavourable",
        "weather_checked": True,
        "forecasts": forecast_list,
        "condition": worst_label,
        "advisory": {
            "title": "Weather Advisory",
            "message": (
                f"The weather forecast for your selected travel date indicates "
                f"{worst_label.lower()} conditions in your destination. "
                f"This may affect outdoor activities."
            ),
            "condition": worst_label,
        },
        "indoor_alternatives_available": has_indoor,
        "district_indoor_info": district_indoor_info,
    }


def generate_weather_aware_places(
    db: Session,
    ranked_places: list[dict],
) -> dict:
    """Filter to only indoor/Both places, grouped by district.
    If a district has zero indoor places, ALL its places are removed
    (the day stays empty and a warning is shown).

    Returns:
        dict with:
          - adapted_places: indoor/Both + trek places, district-scoped
          - removals: list of {district, warning} for districts with no indoor places
    """
    districts = {}
    for place in ranked_places:
        d = place.get("district", "") or "unknown"
        if d not in districts:
            districts[d] = []
        districts[d].append(place)

    adapted = []
    removals = []

    for district, places in districts.items():
        indoor = [
            p for p in places
            if (p.get("indoor_outdoor", "outdoor") or "").lower() in ("indoor", "both")
            or p.get("is_trek", False)
        ]

        if indoor:
            adapted.extend(indoor)
        else:
            removals.append({
                "district": district,
                "warning": (
                    f"No indoor places available in {district}. "
                    f"This district primarily contains outdoor attractions. "
                    f"Consider travelling when weather conditions become favourable."
                ),
            })

    return {
        "adapted_places": adapted,
        "removals": removals,
    }


def _count_indoor_places(db: Session, district: str) -> int:
    if not district or not district.strip():
        return 0
    try:
        result = db.execute(
            text("""
                SELECT COUNT(*) FROM itinerary_places
                WHERE "District" ILIKE :district
                  AND "Indoor_Outdoor" IN ('Indoor', 'Both')
                  AND (is_trek = false OR is_trek IS NULL)
            """),
            {"district": f"%{district}%"},
        ).scalar()
        return result or 0
    except Exception:
        return 0


def _find_indoor_places(db: Session, district: str, category: str = None) -> list[dict]:
    if not district or not district.strip():
        return []
    query = """
        SELECT place_id, place_name, "District", "Category",
               "Indoor_Outdoor", "Weather_Sensitivity", "Mobility",
               "Budget_level", "Entry_Fee",
               "Latitude", "Longitude",
               estimated_duration_value, estimated_duration_unit
        FROM itinerary_places
        WHERE "District" ILIKE :district
          AND "Indoor_Outdoor" IN ('Indoor', 'Both')
          AND (is_trek = false OR is_trek IS NULL)
    """
    params = {"district": f"%{district}%"}
    if category:
        query += ' AND "Category" ILIKE :category'
        params["category"] = f"%{category}%"

    try:
        rows = db.execute(text(query), params).fetchall()
        results = []
        for r in rows:
            results.append({
                "place_id": r[0],
                "place_name": r[1],
                "district": r[2],
                "category": r[3],
                "indoor_outdoor": (r[4] or "").lower(),
                "weather_sensitivity": (r[5] or "").lower(),
                "mobility": r[6],
                "budget_level": r[7],
                "entry_fee": r[8],
                "latitude": float(r[9]) if r[9] else None,
                "longitude": float(r[10]) if r[10] else None,
                "duration_hours": _convert_duration(r[11], r[12]),
            })
        return results
    except Exception:
        return []


def _convert_duration(value, unit) -> float:
    if not value:
        return 1.5
    val = float(value)
    u = (unit or "hours").lower()
    if "day" in u:
        return val * 8
    if "min" in u:
        return val / 60
    return val
