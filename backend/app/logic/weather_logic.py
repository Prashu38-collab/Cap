import requests
from datetime import date, datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from geopy.geocoders import Nominatim

BAGMATI_DISTRICTS = [
    "Kathmandu", "Lalitpur", "Bhaktapur", "Nuwakot", "Rasuwa",
    "Sindhupalchok", "Kavrepalanchok", "Chitwan", "Dolakha", "Sindhuli",
]

FORECAST_WINDOW_DAYS = 7


def get_district_coordinates(district_name: str) -> tuple[float, float]:
    geolocator = Nominatim(user_agent="weather_data")
    location = geolocator.geocode(f"{district_name}, Nepal")
    if not location:
        raise ValueError(f"Could not find coordinates for {district_name}")
    return location.latitude, location.longitude


def get_forecast_for_date(district_name: str, travel_date: date) -> dict | None:
    lat, lon = get_district_coordinates(district_name)
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": [
            "weather_code", "temperature_2m_max", "temperature_2m_min",
            "precipitation_sum", "rain_sum", "snowfall_sum", "wind_speed_10m_max",
        ],
        "timezone": "Asia/Kathmandu",
        "start_date": travel_date.isoformat(),
        "end_date": travel_date.isoformat(),
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    daily = data.get("daily")
    if not daily or not daily.get("time"):
        return None
    idx = 0
    wc = daily["weather_code"][idx]
    rain = daily["rain_sum"][idx] or 0
    snow = daily["snowfall_sum"][idx] or 0
    precip = daily["precipitation_sum"][idx] or 0
    return {
        "weather_code": wc,
        "temp_max": daily["temperature_2m_max"][idx],
        "temp_min": daily["temperature_2m_min"][idx],
        "precipitation_sum": precip,
        "rain_sum": rain,
        "snowfall_sum": snow,
        "wind_speed_max": daily["wind_speed_10m_max"][idx],
        "is_bad_weather": wc >= 51 or rain > 5.0 or snow > 0.0 or precip > 5.0,
    }


def is_within_forecast_window(travel_date: date) -> bool:
    today = date.today()
    delta = (travel_date - today).days
    return 0 <= delta <= FORECAST_WINDOW_DAYS


def is_bad_weather(weather: dict) -> bool:
    rain = weather.get("current_rain", 0) or 0
    showers = weather.get("current_showers", 0) or 0
    precip = weather.get("current_precipitation", 0) or 0
    snow = weather.get("current_snowfall", 0) or 0
    clouds = weather.get("current_cloud_cover", 0) or 0
    return rain > 0 or showers > 0 or precip > 0 or snow > 0 or clouds > 80


def get_current_weather(db: Session, district_name: str) -> dict | None:
    row = db.execute(
        text("""
            SELECT *
            FROM weather
            WHERE LOWER(district_name) = LOWER(:district)
            ORDER BY COALESCE(timestamp, updated_at) DESC NULLS LAST
            LIMIT 1
        """),
        {"district": district_name},
    ).fetchone()
    return dict(row._mapping) if row else None


def fetch_current_weather_from_api(lat: float, lon: float) -> dict:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m", "relative_humidity_2m", "apparent_temperature",
            "is_day", "precipitation", "rain", "showers", "snowfall",
            "cloud_cover", "wind_speed_10m", "wind_direction_10m",
        ],
        "timezone": "Asia/Kathmandu",
        "forecast_days": 1,
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def refresh_district_weather(db: Session, district_name: str):
    lat, lon = get_district_coordinates(district_name)
    raw = fetch_current_weather_from_api(lat, lon)
    current = raw["current"]

    db.execute(
        text("""
            INSERT INTO weather (
                district_name, latitude, longitude,
                current_temperature_2m, current_relative_humidity_2m,
                current_apparent_temperature, current_is_day,
                current_precipitation, current_rain, current_showers,
                current_snowfall, current_cloud_cover,
                current_wind_speed_10m, current_wind_direction_10m,
                timestamp
            ) VALUES (
                :district, :lat, :lon,
                :temp, :hum, :app_temp, :is_day,
                :precip, :rain, :showers, :snow,
                :clouds, :wind_sp, :wind_dir, NOW()
            )
            ON CONFLICT (district_name)
            DO UPDATE SET
                current_temperature_2m = EXCLUDED.current_temperature_2m,
                current_relative_humidity_2m = EXCLUDED.current_relative_humidity_2m,
                current_apparent_temperature = EXCLUDED.current_apparent_temperature,
                current_is_day = EXCLUDED.current_is_day,
                current_precipitation = EXCLUDED.current_precipitation,
                current_rain = EXCLUDED.current_rain,
                current_showers = EXCLUDED.current_showers,
                current_snowfall = EXCLUDED.current_snowfall,
                current_cloud_cover = EXCLUDED.current_cloud_cover,
                current_wind_speed_10m = EXCLUDED.current_wind_speed_10m,
                current_wind_direction_10m = EXCLUDED.current_wind_direction_10m,
                timestamp = EXCLUDED.timestamp,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude
        """),
        {
            "district": district_name,
            "lat": lat,
            "lon": lon,
            "temp": current["temperature_2m"],
            "hum": current["relative_humidity_2m"],
            "app_temp": current["apparent_temperature"],
            "is_day": current["is_day"],
            "precip": current["precipitation"],
            "rain": current["rain"],
            "showers": current["showers"],
            "snow": current["snowfall"],
            "clouds": current["cloud_cover"],
            "wind_sp": current["wind_speed_10m"],
            "wind_dir": current["wind_direction_10m"],
        },
    )
    db.commit()


def refresh_all_weather(db: Session):
    for district in BAGMATI_DISTRICTS:
        try:
            refresh_district_weather(db, district)
        except Exception as e:
            db.rollback()
            print(f"Weather refresh failed for {district}: {e}")
