import requests
from datetime import date, timedelta
from typing import Optional, Union
from geopy.geocoders import Nominatim

FORECAST_WINDOW_DAYS = 16

_geocoder = Nominatim(user_agent="weather_layer")


class WeatherForecast:
    def __init__(self, district: str, date_str: str, raw: dict):
        self.district = district
        self.date = date_str
        self.weather_code: int = raw.get("weather_code", 0) or 0
        self.temp_max: float = raw.get("temp_max", 0) or 0
        self.temp_min: float = raw.get("temp_min", 0) or 0
        self.precipitation_sum: float = raw.get("precipitation_sum", 0) or 0
        self.rain_sum: float = raw.get("rain_sum", 0) or 0
        self.snowfall_sum: float = raw.get("snowfall_sum", 0) or 0
        self.wind_speed_max: float = raw.get("wind_speed_max", 0) or 0

    def to_dict(self) -> dict:
        return {
            "district": self.district,
            "date": self.date,
            "weather_code": self.weather_code,
            "temp_max": self.temp_max,
            "temp_min": self.temp_min,
            "precipitation_sum": self.precipitation_sum,
            "rain_sum": self.rain_sum,
            "snowfall_sum": self.snowfall_sum,
            "wind_speed_max": self.wind_speed_max,
        }


class WeatherService:
    def __init__(self):
        self._cache: dict[str, dict] = {}

    def is_within_forecast_window(self, travel_date_str: str) -> bool:
        today = date.today()
        try:
            travel = date.fromisoformat(travel_date_str)
        except (ValueError, TypeError):
            return False
        delta = (travel - today).days
        return 0 <= delta <= FORECAST_WINDOW_DAYS

    def _get_coordinates(self, district_name: str) -> tuple[float, float]:
        cache_key = district_name.lower()
        if cache_key in self._cache and "_coords" in self._cache[cache_key]:
            return self._cache[cache_key]["_coords"]
        location = _geocoder.geocode(f"{district_name}, Nepal")
        if not location:
            raise ValueError(f"Could not find coordinates for {district_name}")
        coords = (location.latitude, location.longitude)
        self._cache.setdefault(cache_key, {})["_coords"] = coords
        return coords

    def _fetch_forecast_raw(self, lat: float, lon: float) -> dict:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": [
                "weather_code", "temperature_2m_max", "temperature_2m_min",
                "precipitation_sum", "rain_sum", "snowfall_sum",
                "wind_speed_10m_max",
            ],
            "timezone": "Asia/Kathmandu",
            "forecast_days": FORECAST_WINDOW_DAYS,
        }
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        return resp.json()

    def get_forecast(
        self, district_name: str, travel_date_str: str
    ) -> Optional[WeatherForecast]:
        if not self.is_within_forecast_window(travel_date_str):
            return None
        cache_key = f"{district_name.lower()}:{travel_date_str}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if "forecast" in cached:
                return cached["forecast"]
        try:
            lat, lon = self._get_coordinates(district_name)
            raw = self._fetch_forecast_raw(lat, lon)
        except Exception:
            return None
        dates = raw.get("daily", {}).get("time", [])
        for i, d in enumerate(dates):
            if d == travel_date_str:
                daily = raw["daily"]
                forecast = WeatherForecast(
                    district=district_name,
                    date_str=travel_date_str,
                    raw={
                        "weather_code": daily["weather_code"][i],
                        "temp_max": daily["temperature_2m_max"][i],
                        "temp_min": daily["temperature_2m_min"][i],
                        "precipitation_sum": daily["precipitation_sum"][i],
                        "rain_sum": daily["rain_sum"][i],
                        "snowfall_sum": daily["snowfall_sum"][i],
                        "wind_speed_max": daily["wind_speed_10m_max"][i],
                    },
                )
                self._cache[cache_key] = {"forecast": forecast}
                return forecast
        return None

    def get_forecasts_for_districts(
        self, districts: list[str], travel_date_str: str
    ) -> dict[str, Optional[WeatherForecast]]:
        results = {}
        for district in districts:
            results[district] = self.get_forecast(district, travel_date_str)
        return results

    @staticmethod
    def get_weather_flags_from_db(
        db,
        districts: Union[str, list[str]],
        travel_date: str,
        days: int,
    ) -> list[dict]:
        """Per-day weather flags used by itinerary generation.

        Args:
            districts: a single district name (applied to every day) or a list
                with one district per day.
            travel_date: ISO date string of the first travel day.
            days: number of itinerary days.

        Returns:
            list of {day, district, is_bad_weather, condition, temp_max,
            temp_min} for each day (1..days). Days with no forecast simply
            report is_bad_weather=False.
        """
        from .weather_rules import is_favourable, condition_label

        service = WeatherService()
        if isinstance(districts, str):
            per_day = [districts] * days
        else:
            per_day = list(districts)
            if not per_day:
                per_day = [""] * days
            elif len(per_day) < days:
                per_day += [per_day[-1]] * (days - len(per_day))

        try:
            travel = date.fromisoformat(travel_date) if travel_date else None
        except (ValueError, TypeError):
            travel = None

        flags = []
        for day_num in range(1, days + 1):
            district = per_day[day_num - 1]
            day_str = None
            if travel is not None:
                day_str = (travel + timedelta(days=day_num - 1)).isoformat()
            forecast = service.get_forecast(district, day_str) if day_str else None
            flags.append({
                "day": day_num,
                "district": district,
                "is_bad_weather": bool(forecast) and not is_favourable(forecast),
                "condition": condition_label(forecast),
                "temp_max": getattr(forecast, "temp_max", None),
                "temp_min": getattr(forecast, "temp_min", None),
                "precipitation_sum": getattr(forecast, "precipitation_sum", None),
            })
        return flags
