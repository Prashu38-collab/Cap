FAVOURABLE_WMO_CODES = set(range(0, 4))
FAVOURABLE_WMO_CODES.update(range(45, 49))

MAX_FAVOURABLE_PRECIPITATION_MM = 0.5
MAX_FAVOURABLE_RAIN_MM = 0.5
MAX_FAVOURABLE_SNOW_MM = 0.0
MAX_FAVOURABLE_WIND_KMH = 40.0


def is_favourable(forecast) -> bool:
    if forecast is None:
        return True
    if hasattr(forecast, "weather_code"):
        wmo = forecast.weather_code
        precip = forecast.precipitation_sum
        rain = forecast.rain_sum
        snow = forecast.snowfall_sum
        wind = forecast.wind_speed_max
    else:
        wmo = forecast.get("weather_code", 0) or 0
        precip = forecast.get("precipitation_sum", 0) or 0
        rain = forecast.get("rain_sum", 0) or 0
        snow = forecast.get("snowfall_sum", 0) or 0
        wind = forecast.get("wind_speed_max", 0) or 0
    if wmo not in FAVOURABLE_WMO_CODES:
        return False
    if precip > MAX_FAVOURABLE_PRECIPITATION_MM:
        return False
    if rain > MAX_FAVOURABLE_RAIN_MM:
        return False
    if snow > MAX_FAVOURABLE_SNOW_MM:
        return False
    if wind > MAX_FAVOURABLE_WIND_KMH:
        return False
    return True


def condition_label(forecast) -> str:
    if forecast is None:
        return "Unknown"
    if hasattr(forecast, "weather_code"):
        wmo = forecast.weather_code
    else:
        wmo = forecast.get("weather_code", 0) or 0
    LABELS = {
        0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
        45: "Fog", 48: "Rime Fog",
        51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
        56: "Freezing Drizzle", 57: "Dense Freezing Drizzle",
        61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
        66: "Freezing Rain", 67: "Heavy Freezing Rain",
        71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow", 77: "Snow Grains",
        80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
        85: "Slight Snow Showers", 86: "Heavy Snow Showers",
        95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Heavy Thunderstorm with Hail",
    }
    return LABELS.get(wmo, "Unknown Conditions")
