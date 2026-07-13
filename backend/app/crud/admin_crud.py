from sqlalchemy.orm import Session
from sqlalchemy import text

#----------------------------- DASHBOARD STATISTICS-------------------------

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

# ---------------- Destinations per District DISTRIBUTION ----------------

def get_destinations_per_district(db: Session):

    result = db.execute(
        text("""
            SELECT
                "District",
                COUNT(*) AS total
            FROM itinerary_places
            GROUP BY "District"
            ORDER BY total DESC
        """)
    )

    return result.mappings().all()

# ---------------- CATEGORY DISTRIBUTION ----------------

def get_category_distribution(db: Session):

    result = db.execute(
        text("""
            SELECT
                "Category" AS category,
                COUNT(*) AS total

            FROM itinerary_places

            GROUP BY "Category"

            ORDER BY total DESC
        """)
    )

    return result.mappings().all()

# ---------------- RECENT CONTACT MESSAGES ----------------

def get_recent_messages(db: Session):

    result = db.execute(
        text("""
            SELECT
                name,
                email,
                subject,
                message,
                created_at

            FROM contact_messages

            ORDER BY created_at DESC

            LIMIT 10
        """)
    )

    return result.mappings().all()