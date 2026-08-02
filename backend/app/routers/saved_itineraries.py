from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.crud.itinerary_crud import (
    save_itinerary,
    get_saved_itineraries,
    get_saved_itinerary_by_id,
    update_saved_itinerary,
    delete_saved_itinerary,
)

router = APIRouter(prefix="/saved-itineraries", tags=["Saved Itineraries"])


class SaveItineraryRequest(BaseModel):
    preference_id: int
    itinerary_data: dict
    total_estimated_cost: Optional[float] = None
    status: str = "saved"
    required_days: Optional[int] = None
    user_days: Optional[int] = None


class UpdateItineraryRequest(BaseModel):
    status: Optional[str] = None
    itinerary_data: Optional[dict] = None


@router.post("/")
def create_saved_itinerary(body: SaveItineraryRequest, db: Session = Depends(get_db)):
    """Save a generated itinerary to the database."""
    try:
        if not body.itinerary_data:
            raise HTTPException(status_code=400, detail="itinerary_data is required")

        itinerary = body.itinerary_data.get("itinerary", [])
        if not itinerary:
            raise HTTPException(
                status_code=400,
                detail="itinerary_data.itinerary is empty; nothing to save",
            )

        pref = db.execute(
            text("""
                SELECT preference_id, travel_days, total_budget
                FROM "User_Preferences"
                WHERE preference_id = :pid
            """),
            {"pid": body.preference_id},
        ).fetchone()
        if not pref:
            raise HTTPException(
                status_code=404,
                detail=f"Preference {body.preference_id} not found",
            )

        total_travel_days_used = len(itinerary)
        required_days = body.required_days or body.itinerary_data.get("days") or total_travel_days_used
        user_days = body.user_days or pref.travel_days or required_days
        total_estimated_cost = (
            body.total_estimated_cost
            if body.total_estimated_cost is not None
            else (float(pref.total_budget) if pref.total_budget else 0.0)
        )

        itinerary_id = save_itinerary(
            db=db,
            preference_id=body.preference_id,
            itinerary_data=body.itinerary_data,
            status=body.status,
            total_estimated_cost=total_estimated_cost,
            total_travel_days_used=total_travel_days_used,
            required_days=required_days,
            user_days=user_days,
        )
        return {
            "message": "Itinerary saved successfully",
            "itinerary_id": itinerary_id,
            "status": body.status,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_saved_itineraries(
    preference_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List all saved itineraries, optionally filtered by preference_id."""
    itineraries = get_saved_itineraries(db, preference_id=preference_id, limit=limit, offset=offset)
    return {"itineraries": itineraries, "count": len(itineraries)}


@router.get("/{itinerary_id}")
def read_saved_itinerary(itinerary_id: int, db: Session = Depends(get_db)):
    """Get a single saved itinerary with full data."""
    itin = get_saved_itinerary_by_id(db, itinerary_id)
    if not itin:
        raise HTTPException(404, "Itinerary not found")
    return itin


@router.put("/{itinerary_id}")
def update_saved_itinerary_endpoint(
    itinerary_id: int,
    body: UpdateItineraryRequest,
    db: Session = Depends(get_db),
):
    """Update a saved itinerary (status and/or data)."""
    updated = update_saved_itinerary(
        db, itinerary_id,
        status=body.status,
        itinerary_data=body.itinerary_data,
    )
    if not updated:
        raise HTTPException(404, "Itinerary not found")
    return {"message": "Itinerary updated successfully", "itinerary_id": itinerary_id}


@router.delete("/{itinerary_id}")
def delete_saved_itinerary_endpoint(itinerary_id: int, db: Session = Depends(get_db)):
    """Delete a saved itinerary."""
    deleted = delete_saved_itinerary(db, itinerary_id)
    if not deleted:
        raise HTTPException(404, "Itinerary not found")
    return {"message": "Itinerary deleted successfully", "itinerary_id": itinerary_id}
