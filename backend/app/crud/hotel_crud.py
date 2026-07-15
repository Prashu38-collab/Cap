from sqlalchemy.orm import Session
from sqlalchemy import text


# GET ALL HOTELS

def get_all_hotels(db: Session):

    result = db.execute(
        text("""
            SELECT *
            FROM hotels
            ORDER BY hotel_name
        """)
    )

    return result.mappings().all()


# GET ONE HOTEL

def get_hotel_by_id(
    db: Session,
    hotel_id: int
):

    result = db.execute(
        text("""
            SELECT *
            FROM hotels
            WHERE hotel_id=:hotel_id
        """),
        {
            "hotel_id": hotel_id
        }
    )

    return result.mappings().first()


# ADD HOTEL

def create_hotel(
    db: Session,
    hotel
):

    db.execute(
        text("""
            INSERT INTO hotels
            (
                hotel_name,
                review_score,
                budget,
                latitude,
                longitude,
                district,
                destination_id,
                elevation_meters
            )

            VALUES
            (
                :hotel_name,
                :review_score,
                :budget,
                :latitude,
                :longitude,
                :district,
                :destination_id,
                :elevation_meters
            )
        """),
        hotel.dict()
    )

    db.commit()


# UPDATE HOTEL

def update_hotel(
    db: Session,
    hotel_id: int,
    hotel
):

    result = db.execute(
        text("""
            UPDATE hotels

            SET

                hotel_name=:hotel_name,
                review_score=:review_score,
                budget=:budget,
                latitude=:latitude,
                longitude=:longitude,
                district=:district,
                destination_id=:destination_id,
                elevation_meters=:elevation_meters

            WHERE hotel_id=:hotel_id
        """),
        {
            **hotel.dict(),
            "hotel_id": hotel_id
        }
    )

    db.commit()

    return result.rowcount > 0


# DELETE HOTEL

def delete_hotel(
    db: Session,
    hotel_id: int
):

    result = db.execute(
        text("""
            DELETE FROM hotels
            WHERE hotel_id=:hotel_id
        """),
        {
            "hotel_id": hotel_id
        }
    )

    db.commit()

    return result.rowcount > 0