from sqlalchemy import Column, Integer, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from db import Base


class Transport(Base):
    __tablename__ = "transport"

    transport_id = Column(Integer, primary_key=True, index=True)

    place_id = Column(
        Integer,
        ForeignKey("itinerary_places.place_id"),
        nullable=False
    )

    from_district = Column(Text, nullable=False)

    to_district = Column(Text, nullable=False)

    route_code = Column(Text, nullable=False)

    operator = Column(Text, nullable=False)

    transport_type = Column(Text, nullable=False)

    route = Column(Text, nullable=False)

    departure_point = Column(Text, nullable=False)

    arrival_point = Column(Text, nullable=False)

    departure_time = Column(Text, nullable=False)

    duration = Column(Text, nullable=False)

    cost_npr = Column(Numeric, nullable=False)

    # Relationship with itinerary_places
    place = relationship("ItineraryPlace")