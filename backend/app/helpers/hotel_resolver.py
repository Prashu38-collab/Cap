from sqlalchemy import text
from sqlalchemy.orm import Session


def resolve_active_hotel(preference_id: int, db: Session):

    # 1. check user-selected day-wise hotel
    query = text("""
        SELECT h.hotel_id, h.hotel_name, h.latitude, h.longitude, h.district
        FROM trip_hotels t
        JOIN hotels h ON h.hotel_id = t.hotel_id
        WHERE t.preference_id = :id
        ORDER BY t.day_number ASC
        LIMIT 1
    """)

    hotel = db.execute(query, {"id": preference_id}).fetchone()

    if hotel:
        return dict(hotel._mapping)

    # 2. fallback to selected_hotel_id
    fallback = text("""
        SELECT hotel_id, hotel_name, latitude, longitude, district
        FROM hotels
        WHERE hotel_id = (
            SELECT selected_hotel_id
            FROM "User_Preferences"
            WHERE preference_id = :id
        )
    """)

    result = db.execute(fallback, {"id": preference_id}).fetchone()

    if result:
        return dict(result._mapping)

    return None