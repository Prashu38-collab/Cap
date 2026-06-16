from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from datetime import datetime

router = APIRouter(prefix="/weather", tags=["Weather Module"])

# --- PYDANTIC SCHEMA ---
# Maps your exact table columns for the cron job payload
class WeatherCronInput(BaseModel):
    district_name: str = Field(..., example="Kathmandu")
    latitude: float
    longitude: float
    current_temperature_2m: float
    current_relative_humidity_2m: float
    current_apparent_temperature: float
    current_is_day: int
    current_precipitation: float
    current_rain: float
    current_showers: float
    current_snowfall: float
    current_cloud_cover: float
    current_wind_speed_10m: float
    current_wind_direction_10m: float

# --- ENDPOINTS ---

@router.post("/update")
def update_district_weather(data: WeatherCronInput, db: Session = Depends(get_db)):
    """
    updated everytime by cron job to keep the weather metrics up-to-date for each district.
    """
    try:
        # Match your exact column names
        query = text("""
            INSERT INTO weather (
                district_name, latitude, longitude, current_temperature_2m, 
                current_relative_humidity_2m, current_apparent_temperature, 
                current_is_day, current_precipitation, current_rain, 
                current_showers, current_snowfall, current_cloud_cover, 
                current_wind_speed_10m, current_wind_direction_10m, timestamp
            )
            VALUES (
                :district, :lat, :lon, :temp, 
                :humidity, :app_temp, 
                :is_day, :precip, :rain, 
                :showers, :snow, :clouds, 
                :wind_sp, :wind_dir, :ts
            )
            ON CONFLICT (district_name) 
            DO UPDATE SET 
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
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
                timestamp = EXCLUDED.timestamp;
        """)
        
        db.execute(query, {
            "district": data.district_name, "lat": data.latitude, "lon": data.longitude, "temp": data.current_temperature_2m,
            "humidity": data.current_relative_humidity_2m, "app_temp": data.current_apparent_temperature,
            "is_day": data.current_is_day, "precip": data.current_precipitation, "rain": data.current_rain,
            "showers": data.current_showers, "snow": data.current_snowfall, "clouds": data.current_cloud_cover,
            "wind_sp": data.current_wind_speed_10m, "wind_dir": data.current_wind_direction_10m,
            "ts": datetime.utcnow()
        })
        db.commit()
        return {"status": "Success", "message": f"PostgreSQL weather metrics updated via cron for {data.district_name}."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database write execution error: {str(e)}")


@router.get("/{district_name}")
def check_weather_favorability(district_name: str, db: Session = Depends(get_db)):
    """
    Evaluates weather rules to see if the content-based filtering output needs 
    to be post-processed for indoor fallback routing.
    """
    # Fetch your rich row structure
    query = text("""
        SELECT current_rain, current_showers, current_precipitation, current_cloud_cover, current_temperature_2m 
        FROM weather 
        WHERE LOWER(district_name) = LOWER(:district) 
        ORDER BY timestamp DESC 
        LIMIT 1;
    """)
    row = db.execute(query, {"district": district_name}).fetchone()
    
    if not row:
        return {
            "district": district_name,
            "weather_condition": "No real-time telemetry recorded. Defaulting to clear.",
            "is_favorable_for_outdoors": True
        }
        
    # Mapping the tuple outputs based on chosen array indexes
    rain = row[0]
    showers = row[1]
    precipitation = row[2]
    clouds = row[3]
    temperature = row[4]
    
    # --- INTELLIGENT TRAVEL CONDITIONAL CHECKS ---
    is_favorable = True
    status_label = "Good Weather (Clear or Sunny)"
    
    # If there is active rain, heavy showers, or thick storm clouds over the valley/district
    if rain > 0.0 or showers > 0.0 or precipitation > 0.0 or clouds > 80:
        is_favorable = False
        status_label = "Unfavorable Weather (Active Rain/Dense Overcast)"
    elif temperature < 5.0:
        is_favorable = False
        status_label = "Unfavorable Weather (Extreme Cold Alert)"
        
    return {
        "district": district_name,
        "weather_condition": status_label,
        "is_favorable_for_outdoors": is_favorable,
        "current_temperature": temperature,
        "debug_metrics": {
            "rain_mm": rain,
            "showers_mm": showers,
            "cloud_cover_pct": clouds
        }
    }