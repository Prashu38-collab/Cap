# app/services/itinerary_service.py

from sqlalchemy.orm import Session
from app.logic.itinerary_engine import generate_master_itinerary as _build_master

def generate_full_itinerary(preference_id: int, db: Session):
    """
    The Master Orchestrator.
    """
    result = _build_master(db, preference_id)
    return result