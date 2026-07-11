from pydantic import BaseModel
from typing import Optional
from datetime import time


class DestinationCreate(BaseModel):

    place_name: str
    District: str
    Latitude: float
    Longitude: float
    Category: str
    Indoor_Outdoor: str
    Mobility: str
    Weather_Sensitivity: str
    Budget_level: str
    Entry_Fee: str
    province: int
    estimated_duration_value: float
    estimated_duration_unit: str
    is_trek: bool
    elevation_meters: Optional[int] = None
    opening_time: Optional[time] = None
    closing_time: Optional[time] = None


class DestinationUpdate(BaseModel):

    place_name: str
    District: str
    Latitude: float
    Longitude: float
    Category: str
    Indoor_Outdoor: str
    Mobility: str
    Weather_Sensitivity: str
    Budget_level: str
    Entry_Fee: str
    province: int
    estimated_duration_value: float
    estimated_duration_unit: str
    is_trek: bool
    elevation_meters: Optional[int] = None
    opening_time: Optional[time] = None
    closing_time: Optional[time] = None