from pydantic import BaseModel
from typing import List


class TransportOption(BaseModel):
    transport_id: int
    place_id: int

    from_district: str
    to_district: str

    route_code: str
    operator: str
    transport_type: str

    route: str

    departure_point: str
    arrival_point: str

    departure_time: str
    duration: str

    cost_npr: float

    class Config:
        from_attributes = True


class TransportSegment(BaseModel):
    from_district: str
    to_district: str
    options: List[TransportOption]


class TransportResponse(BaseModel):
    trip_id: int
    transport: List[TransportSegment]