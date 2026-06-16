from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db

router = APIRouter(
    prefix="/places",
    tags=["Places"]
)


# REQUEST MODEL

class PlaceFilterRequest(BaseModel):
    district: str
    categories: Optional[List[str]] = None
    budget_level: Optional[str] = None
    mobility: Optional[str] = None


# RESPONSE MODEL

class PlaceResponse(BaseModel):
    place_id: int
    place_name: str
    district: str
    latitude: float
    longitude: float
    category: str
    indoor_outdoor: Optional[str]
    mobility: Optional[str]
    budget_level: Optional[str]
    entry_fee: Optional[str]

    class Config:
        from_attributes = True



# API 1 - FILTER PLACES


@router.post("/filter", response_model=List[PlaceResponse])
def filter_places(
    request: PlaceFilterRequest,
    db: Session = Depends(get_db)
):
    try:

        query = """
        SELECT
            place_id,
            place_name,
            "District" AS district,
            "Latitude" AS latitude,
            "Longitude" AS longitude,
            "Category" AS category,
            "Indoor_Outdoor" AS indoor_outdoor,
            "Mobility" AS mobility,
            "Budget_level" AS budget_level,
            "Entry_Fee" AS entry_fee
        FROM itinerary_places
        WHERE 1=1
        """

        params = {}

        # ==========================================
        # DISTRICT (MANDATORY)
        # ==========================================

        query += ' AND "District" ILIKE :district'
        params["district"] = f"%{request.district}%"

        # ==========================================
        # CATEGORIES (OPTIONAL MULTIPLE)
        # ==========================================

        if request.categories:

            category_conditions = []

            for i, category in enumerate(request.categories):

                param_name = f"cat_{i}"

                category_conditions.append(
                    f'"Category" ILIKE :{param_name}'
                )

                params[param_name] = category

            query += " AND (" + " OR ".join(category_conditions) + ")"

        # ==========================================
        # BUDGET FILTER
        # ==========================================

        if request.budget_level:

            query += ' AND "Budget_level" = :budget_level'

            params["budget_level"] = request.budget_level

        # ==========================================
        # MOBILITY FILTER
        # ==========================================

        if request.mobility:

            query += ' AND "Mobility" = :mobility'

            params["mobility"] = request.mobility

        result = db.execute(text(query), params)

        rows = result.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail="No places found matching your filters"
            )

        places = []

        for row in rows:

            places.append(
                PlaceResponse(
                    place_id=row.place_id,
                    place_name=row.place_name,
                    district=row.district,
                    latitude=float(row.latitude),
                    longitude=float(row.longitude),
                    category=row.category,
                    indoor_outdoor=row.indoor_outdoor,
                    mobility=row.mobility,
                    budget_level=row.budget_level,
                    entry_fee=row.entry_fee
                )
            )

        return places

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )



# API 2 - GET ALL PLACES IN DISTRICT


@router.get("/district/{district_name}",
            response_model=List[PlaceResponse])
def get_places_by_district(
    district_name: str,
    db: Session = Depends(get_db)
):
    try:

        query = text("""
        SELECT
            place_id,
            place_name,
            "District" AS district,
            "Latitude" AS latitude,
            "Longitude" AS longitude,
            "Category" AS category,
            "Indoor_Outdoor" AS indoor_outdoor,
            "Mobility" AS mobility,
            "Budget_level" AS budget_level,
            "Entry_Fee" AS entry_fee
        FROM itinerary_places
        WHERE "District" ILIKE :district
        """)

        result = db.execute(
            query,
            {"district": f"%{district_name}%"}
        )

        rows = result.fetchall()

        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"No places found in {district_name}"
            )

        places = []

        for row in rows:

            places.append(
                PlaceResponse(
                    place_id=row.place_id,
                    place_name=row.place_name,
                    district=row.district,
                    latitude=float(row.latitude),
                    longitude=float(row.longitude),
                    category=row.category,
                    indoor_outdoor=row.indoor_outdoor,
                    mobility=row.mobility,
                    budget_level=row.budget_level,
                    entry_fee=row.entry_fee
                )
            )

        return places

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )



# API 3 - GET ALL PLACES


@router.get("/all", response_model=List[PlaceResponse])
def get_all_places(
    db: Session = Depends(get_db)
):
    try:

        query = text("""
        SELECT
            place_id,
            place_name,
            "District" AS district,
            "Latitude" AS latitude,
            "Longitude" AS longitude,
            "Category" AS category,
            "Indoor_Outdoor" AS indoor_outdoor,
            "Mobility" AS mobility,
            "Budget_level" AS budget_level,
            "Entry_Fee" AS entry_fee
        FROM itinerary_places
        """)

        result = db.execute(query)

        rows = result.fetchall()

        places = []

        for row in rows:

            places.append(
                PlaceResponse(
                    place_id=row.place_id,
                    place_name=row.place_name,
                    district=row.district,
                    latitude=float(row.latitude),
                    longitude=float(row.longitude),
                    category=row.category,
                    indoor_outdoor=row.indoor_outdoor,
                    mobility=row.mobility,
                    budget_level=row.budget_level,
                    entry_fee=row.entry_fee
                )
            )

        return places

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )