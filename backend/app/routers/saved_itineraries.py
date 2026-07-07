from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

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
    status: str = "generated"


class UpdateItineraryRequest(BaseModel):
    status: Optional[str] = None
    itinerary_data: Optional[dict] = None


@router.post("/")
def create_saved_itinerary(body: SaveItineraryRequest, db: Session = Depends(get_db)):
    """Save a generated itinerary to the database."""
    try:
        itinerary_id = save_itinerary(
            db=db,
            preference_id=body.preference_id,
            itinerary_data=body.itinerary_data,
            status=body.status,
            total_estimated_cost=body.total_estimated_cost,
        )
        return {
            "message": "Itinerary saved successfully",
            "itinerary_id": itinerary_id,
        }
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
