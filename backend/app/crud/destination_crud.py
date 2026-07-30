from sqlalchemy.orm import Session
from sqlalchemy import text

from app.crud.admin_activity_crud import log_admin_activity

# ---------------- GET ALL DESTINATIONS ----------------

def get_all_destinations(db: Session):

    # result = db.execute(
    #     text("""
    #         SELECT *
    #         FROM itinerary_places
    #         ORDER BY place_name
    #     """)
    # )

    result = db.execute(
    text("""
        SELECT
            place_id,
            place_name,
            "District",
            "Latitude",
            "Longitude",
            "Category",
            "Indoor_Outdoor",
            "Mobility",
            "Weather_Sensitivity",
            "Budget_level",
            "Entry_Fee",
            province,
            estimated_duration_value,
            estimated_duration_unit,
            is_trek,
            elevation_meters,
            opening_time,
            closing_time
        FROM itinerary_places
        ORDER BY place_name
    """)
)

    return result.fetchall()

# ---------------- GET ONE DESTINATION ----------------

def get_destination_by_id(
    db: Session,
    place_id: int
):

    result = db.execute(
        text("""

            SELECT
            place_id,
            place_name,
            "District",
            "Latitude",
            "Longitude",
            "Category",
            "Indoor_Outdoor",
            "Mobility",
            "Weather_Sensitivity",
            "Budget_level",
            "Entry_Fee",
            province,
            estimated_duration_value,
            estimated_duration_unit,
            is_trek,
            elevation_meters,
            opening_time,
            closing_time
             
            FROM itinerary_places
            WHERE place_id = :place_id
        """),
        {
            "place_id": place_id
        }
    )

    return result.fetchone()

# ---------------- ADD DESTINATION ----------------

def create_destination(
    db: Session,
    destination
):

    db.execute(
        text("""
             
            INSERT INTO itinerary_places
            (
                place_name,
                "District",
                "Latitude",
                "Longitude",
                "Category",
                "Indoor_Outdoor",
                "Mobility",
                "Weather_Sensitivity",
                "Budget_level",
                "Entry_Fee",
                province,
                estimated_duration_value,
                estimated_duration_unit,
                is_trek,
                elevation_meters,
                opening_time,
                closing_time
            )

            VALUES
            (
                :place_name,
                :District,
                :Latitude,
                :Longitude,
                :Category,
                :Indoor_Outdoor,
                :Mobility,
                :Weather_Sensitivity,
                :Budget_level,
                :Entry_Fee,
                :province,
                :estimated_duration_value,
                :estimated_duration_unit,
                :is_trek,
                :elevation_meters,
                :opening_time,
                :closing_time
            )
        """),
        destination.dict()
    )

    db.commit()

    log_admin_activity(
        db,
        "Destination Added",
        f"Added destination '{destination.place_name}'"
    )

# ---------------- UPDATE DESTINATION ----------------

def update_destination(
    db: Session,
    place_id: int,
    destination
):

    result = db.execute(
        text("""
            UPDATE itinerary_places

            SET

                place_name=:place_name,
                "District"=:District,
                "Latitude"=:Latitude,
                "Longitude"=:Longitude,
                "Category"=:Category,
                "Indoor_Outdoor"=:Indoor_Outdoor,
                "Mobility"=:Mobility,
                "Weather_Sensitivity"=:Weather_Sensitivity,
                "Budget_level"=:Budget_level,
                "Entry_Fee"=:Entry_Fee,
             
                province=:province,
                estimated_duration_value=:estimated_duration_value,
                estimated_duration_unit=:estimated_duration_unit,
                is_trek=:is_trek,
                elevation_meters=:elevation_meters,
                opening_time=:opening_time,
                closing_time=:closing_time

            WHERE place_id=:place_id
        """),
        {
            **destination.dict(),
            "place_id": place_id
        }
    )

    db.commit()

    log_admin_activity(
    db,
    "Destination Updated",
    f"Updated destination '{destination.place_name}'"
)

    return result.rowcount > 0


# ---------------- DELETE DESTINATION ----------------

def delete_destination(
    db: Session,
    place_id: int
):

    # Get destination name first
    destination = db.execute(
        text("""
            SELECT place_name
            FROM itinerary_places
            WHERE place_id = :place_id
        """),
        {
            "place_id": place_id
        }
    ).mappings().first()

    if not destination:
        return False

    place_name = destination["place_name"]

    # Delete destination
    result = db.execute(
        text("""
            DELETE FROM itinerary_places
            WHERE place_id = :place_id
        """),
        {
            "place_id": place_id
        }
    )

    db.commit()

    # Log activity
    log_admin_activity(
        db,
        "Destination Deleted",
        f"Deleted destination '{place_name}'"
    )

    return result.rowcount > 0