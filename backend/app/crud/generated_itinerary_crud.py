from sqlalchemy.orm import Session
from sqlalchemy import text

from app.crud.admin_activity_crud import log_admin_activity

# ---------------- GET ALL GENERATED ITINERARIES ----------------

def get_all_generated_itineraries(db: Session):

    result = db.execute(
        text("""
            SELECT
                i.itinerary_id,
                u.name,
                i.preference_id,
                i.status,
                i.total_estimated_cost,
                i.total_travel_days_used,
                i.required_days,
                i.user_days,
                i.generated_at,
                i.itinerary_data

            FROM generated_itineraries i

            JOIN "User_Preferences" p
                ON i.preference_id = p.preference_id

            JOIN users u
                ON p.user_id = u.user_id

            ORDER BY i.generated_at DESC
        """)
    )

    return result.mappings().all()


# ---------------- GET ONE ----------------

def get_generated_itinerary_by_id(
    db: Session,
    itinerary_id: int
):

    result = db.execute(
        text("""
            SELECT
                i.*,
                u.name

            FROM generated_itineraries i

            JOIN "User_Preferences" p
                ON i.preference_id = p.preference_id

            JOIN users u
                ON p.user_id = u.user_id

            WHERE i.itinerary_id = :id
        """),
        {
            "id": itinerary_id
        }
    )

    return result.mappings().first()


# ---------------- DELETE ----------------


def delete_generated_itinerary(
    db: Session,
    itinerary_id: int
):

    # Get itinerary info before deleting
    itinerary = db.execute(
        text("""
            SELECT
                itinerary_id,
                preference_id
            FROM generated_itineraries
            WHERE itinerary_id = :id
        """),
        {
            "id": itinerary_id
        }
    ).mappings().first()

    if not itinerary:
        return False

    # Delete itinerary
    result = db.execute(
        text("""
            DELETE FROM generated_itineraries
            WHERE itinerary_id = :id
        """),
        {
            "id": itinerary_id
        }
    )

    db.commit()

    # Log activity
    log_admin_activity(
        db,
        "Generated Itinerary Deleted",
        f"Deleted itinerary #{itinerary['itinerary_id']} (Preference ID: {itinerary['preference_id']})"
    )

    return result.rowcount > 0