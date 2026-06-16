from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from app.database import get_db

router = APIRouter(
    prefix="/itinerary",
    tags=["Integrated Itinerary Coordinator"]
)

# --- REQUEST SCHEMA ---
class GenerateItineraryPayload(BaseModel):
    district: str
    budget_level: str
    category: str
    mobility: str
    preferences: List[str]

@router.post("/generate-weather-safe")
def generate_weather_safe_itinerary(payload: GenerateItineraryPayload, db: Session = Depends(get_db)):
    """
    Integrating content-based filtering criteria and real-time live weather telemetry safely.
    """
    try:
        # =====================================================
        # PHASE 1: CHECK THE LIVE WEATHER CONDITIONS
        # =====================================================
        weather_query = text("""
            SELECT current_rain, current_showers, current_precipitation, current_cloud_cover 
            FROM weather 
            WHERE LOWER(district_name) = LOWER(:district) 
            LIMIT 1;
        """)
        weather_row = db.execute(weather_query, {"district": payload.district}).fetchone()
        
        is_raining = False
        if weather_row:
            # If there is active rain, showers, or severe precipitation, flag it
            if weather_row[0] > 0.0 or weather_row[1] > 0.0 or weather_row[2] > 0.0:
                is_raining = True

        # =====================================================
        # PHASE 2: EXECUTE CONTENT-BASED FILTERING (FRIENDS' MODULE MATCHING)
        # =====================================================
        # FIXED: Added Mobility filter string and switched to case-insensitive ILIKE matching
        query = """
        SELECT
            place_id,
            place_name,
            "District" AS district,
            "Category" AS category,
            "Indoor_Outdoor" AS indoor_outdoor,
            "Budget_level" AS budget_level,
            "Mobility" AS mobility
        FROM itinerary_places
        WHERE "District" ILIKE :district
          AND "Budget_level" ILIKE :budget_level
          AND "Mobility" ILIKE :mobility
        """
        
        sql_params = {
            "district": f"%{payload.district}%",
            "budget_level": f"%{payload.budget_level}%",
            "mobility": f"%{payload.mobility}%"
        }

        # Mirroring your friends' preference matching rules cleanly
        if payload.preferences:
            pref_conditions = []
            for i, pref in enumerate(payload.preferences):
                param_name = f"pref_{i}"
                pref_conditions.append(f'"Category" ILIKE :{param_name}')
                sql_params[param_name] = f"%{pref}%"
            
            query += " AND (" + " OR ".join(pref_conditions) + f' OR "Category" ILIKE :main_cat' + ")"
            sql_params["main_cat"] = f"%{payload.category}%"
        else:
            query += ' AND "Category" ILIKE :main_cat'
            sql_params["main_cat"] = f"%{payload.category}%"

        # =====================================================
        # PHASE 3: APPLY RUNTIME WEATHER FILTERS
        # =====================================================
        # FIXED: Changed 'Indoor'/'Outdoor' string values to completely lowercase targets
        if is_raining:
            # BAD WEATHER: Restrict the query to only pull 'Indoor' or 'Both' spots
            query += ' AND (LOWER("Indoor_Outdoor") = \'indoor\' OR LOWER("Indoor_Outdoor") = \'both\')'
        else:
            # GOOD WEATHER: Actively prefer 'Outdoor' and hybrid 'Both' attractions
            query += ' AND (LOWER("Indoor_Outdoor") = \'outdoor\' OR LOWER("Indoor_Outdoor") = \'both\')'

        # Execute final integrated query
        result = db.execute(text(query), sql_params)
        rows = result.fetchall()

        # FIXED: Added descriptive debug info inside the 404 block to isolate data gaps instantly
        if not rows:
            weather_status = "RAINY MODE (Indoor/Both Only)" if is_raining else "CLEAR MODE (Outdoor/Both Only)"
            raise HTTPException(
                status_code=404, 
                detail=f"No attractions matched filters: District={payload.district}, Budget={payload.budget_level}, Mobility={payload.mobility}, Category={payload.category}, Engine State={weather_status}."
            )

        # Structure final clean response
        itinerary_pool = []
        for row in rows:
            itinerary_pool.append({
                "place_id": row.place_id,
                "place_name": row.place_name,
                "district": row.district,
                "category": row.category,
                "environment": row.indoor_outdoor,
                "budget": row.budget_level
            })

        return {
            "requested_destination": payload.district,
            "live_weather_status": "RAIN DETECTED (Forcing Indoor System Routing)" if is_raining else "CLEAR CONDITIONS (Maximizing Outdoor Options)",
            "total_places_selected": len(itinerary_pool),
            "final_itinerary_recommendations": itinerary_pool
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Coordinator Engine Error: {str(e)}")