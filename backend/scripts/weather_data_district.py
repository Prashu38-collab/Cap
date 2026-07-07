# weather_data_district.py
import requests
from geopy.geocoders import Nominatim

def get_district_coordinates(district_name):
    geolocator = Nominatim(user_agent="weather_data")
    location = geolocator.geocode(district_name + ", Nepal") # Added Nepal for accuracy
    if location:
        return location.latitude, location.longitude
    else:
        raise ValueError(f"Could not find coordinates for: {district_name}")
    
def get_weather_forecast(latitude, longitude):
    """Fetches 7-day daily forecast from Open-Meteo."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": [
            "weather_code", "temperature_2m_max", "temperature_2m_min", 
            "precipitation_sum", "rain_sum", "snowfall_sum", "wind_speed_10m_max"
        ],
        "timezone": "Asia/Kathmandu",
        "forecast_days": 7
    }
    response = requests.get(url, params=params, timeout=10)
    if response.status_code != 200:
        raise Exception(f"API Error: {response.status_code}")
    return response.json()

def extract_data(district_name):
    coordinates = get_district_coordinates(district_name)
    raw_data = get_weather_forecast(coordinates[0], coordinates[1])
    return raw_data, coordinates

def transform_forecast_data(response, district_name, coordinates):
    """Transforms 7-day forecast into a list of rows for the DB."""
    daily = response["daily"]
    time_list = daily["time"] 
    rows_to_insert = []
    
    for i in range(len(time_list)):
        # WMO Codes: 51-67 (Drizzle/Rain), 71-77 (Snow), 95-99 (Thunderstorm)
        is_bad = (
            daily["rain_sum"][i] > 5.0 or 
            daily["snowfall_sum"][i] > 0.0 or 
            daily["weather_code"][i] >= 51
        )
        
        row = {
            "district_name": district_name,
            "latitude": coordinates[0],
            "longitude": coordinates[1],
            "forecast_date": time_list[i], 
            "weather_code": daily["weather_code"][i],
            "temp_max": daily["temperature_2m_max"][i],
            "temp_min": daily["temperature_2m_min"][i],
            "precipitation_sum": daily["precipitation_sum"][i],
            "rain_sum": daily["rain_sum"][i],
            "snowfall_sum": daily["snowfall_sum"][i],
            "wind_speed_max": daily["wind_speed_10m_max"][i],
            "is_bad_weather": is_bad
        }
        rows_to_insert.append(row)
    return rows_to_insert