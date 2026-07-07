from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

def get_hotels_by_preference(preference_id: int, db: Session):

    try:
        pref_query = text("""
            SELECT ending_district, starting_district, hotel_budget
            FROM "User_Preferences"
            WHERE preference_id = :pref_id
        """)

        pref = db.execute(pref_query, {"pref_id": preference_id}).fetchone()

        if not pref:
            raise HTTPException(status_code=404, detail="Preference not found")

        # Use ending_district (destination) — never suggest hotels in starting/transit districts
        district = pref.ending_district or pref.starting_district
        budget = pref.hotel_budget

        hotel_query = text("""
            SELECT hotel_id, hotel_name, district, budget, review_score
            FROM hotels
            WHERE district ILIKE :district
            AND budget <= :budget
            ORDER BY review_score DESC
        """)

        hotels = db.execute(hotel_query, {
            "district": district,
            "budget": budget
        }).fetchall()

        return {
            "message": "Hotels fetched successfully",
            "count": len(hotels),
            "data": [
                {
                    "hotel_id": h.hotel_id,
                    "hotel_name": h.hotel_name,
                    "district": h.district,
                    "budget": float(h.budget),
                    "review_score": float(h.review_score or 0)
                }
                for h in hotels
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# 2. SAVE DAY-WISE HOTEL SELECTION
# =====================================================

def save_trip_hotels(preference_id: int, selections: list, db: Session):

    try:
        # validate preference
        pref_check = db.execute(
            text("""
                SELECT preference_id
                FROM "User_Preferences"
                WHERE preference_id = :pid
            """),
            {"pid": preference_id}
        ).fetchone()

        if not pref_check:
            raise HTTPException(status_code=404, detail="Preference not found")

        # insert day-wise hotels
        for item in selections:
            db.execute(
                text("""
                    INSERT INTO trip_hotels (preference_id, day_number, hotel_id)
                    VALUES (:pid, :day, :hid)
                """),
                {
                    "pid": preference_id,
                    "day": item["day"],
                    "hid": item["hotel_id"]
                }
            )

        db.commit()

        return {
            "message": "Hotels assigned successfully"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))