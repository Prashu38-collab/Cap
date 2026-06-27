# app/services/itinerary_service.py

from sqlalchemy.orm import Session
from app.logic.itinerary_engine import generate_master_itinerary

def generate_full_itinerary(preference_id: int, db: Session):
    """
    The Master Orchestrator.
    """
    # The new engine handles EVERYTHING: Weather, Hotels, Scoring, Routing, Multi-district.
    result = generate_master_itinerary(db, preference_id)
    return result