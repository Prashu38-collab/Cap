from sqlalchemy.orm import Session
from sqlalchemy import text

# DASHBOARD STATISTICS

def get_dashboard_stats(db: Session):

    total_users = db.execute(
        text("""
            SELECT COUNT(*)
            FROM users
        """)
    ).scalar()

    total_destinations = db.execute(
        text("""
            SELECT COUNT(*)
            FROM itinerary_places
        """)
    ).scalar()

    total_hotels = db.execute(
        text("""
            SELECT COUNT(*)
            FROM hotels
        """)
    ).scalar()

    total_itineraries = db.execute(
        text("""
            SELECT COUNT(*)
            FROM generated_itineraries
        """)
    ).scalar()

    return {
        "users": total_users,
        "destinations": total_destinations,
        "hotels": total_hotels,
        "itineraries": total_itineraries
    }