from pydantic import BaseModel
from typing import Optional

class HotelCreate(BaseModel):
    hotel_name: str
    review_score: float
    budget: float
    latitude: float
    longitude: float
    district: str
    destination_id: str
    elevation_meters: Optional[int] = None


class HotelUpdate(BaseModel):
    hotel_name: str
    review_score: float
    budget: float
    latitude: float
    longitude: float
    district: str
    destination_id: str
    elevation_meters: Optional[int] = None