# app/logic/transport_logic.py

from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from app.logic.itinerary_engine import build_itinerary


class TransportService:

    @staticmethod
    def get_transport(db: Session, preference_id: int):

        # -----------------------------
        # Get User Preference
        # -----------------------------
        pref_query = text("""
            SELECT
                preference_id,
                starting_district
            FROM "User_Preferences"
            WHERE preference_id = :pid
        """)

        pref = db.execute(
            pref_query,
            {"pid": preference_id}
        ).fetchone()

        if not pref:
            raise HTTPException(
                status_code=404,
                detail="Preference not found."
            )

        starting_district = pref.starting_district


        # -----------------------------
        # Generate itinerary
        # -----------------------------
        itinerary_data = build_itinerary(
            db,
            preference_id
        )

        itinerary = itinerary_data.get("itinerary", [])

        if not itinerary:
            raise HTTPException(
                status_code=404,
                detail="No itinerary found."
            )


        # First destination from itinerary
        destination_district = itinerary[0]["district"]


        # -----------------------------
        # Outbound Transport
        # -----------------------------
        outbound_query = text("""
            SELECT
                transport_id,
                place_id,
                from_district,
                to_district,
                route_code,
                operator,
                transport_type,
                route,
                departure_point,
                arrival_point,
                departure_time,
                duration,
                cost_npr
            FROM transport
            WHERE
                from_district = :start
            AND
                to_district = :end
            ORDER BY
                transport_type ASC,
                cost_npr ASC
        """)


        outbound = db.execute(
            outbound_query,
            {
                "start": starting_district,
                "end": destination_district
            }
        ).fetchall()



        # -----------------------------
        # Return Transport
        # -----------------------------
        return_query = text("""
            SELECT
                transport_id,
                place_id,
                from_district,
                to_district,
                route_code,
                operator,
                transport_type,
                route,
                departure_point,
                arrival_point,
                departure_time,
                duration,
                cost_npr
            FROM transport
            WHERE
                from_district = :start
            AND
                to_district = :end
            ORDER BY
                transport_type ASC,
                cost_npr ASC
        """)


        return_trip = db.execute(
            return_query,
            {
                "start": destination_district,
                "end": starting_district
            }
        ).fetchall()



        # -----------------------------
        # Format Transport Response
        # -----------------------------
        def format_transport(rows):

            result = []

            for row in rows:

                result.append({

                    "transport_id": row.transport_id,

                    "place_id": row.place_id,

                    "from_district": row.from_district,

                    "to_district": row.to_district,

                    "route_code": row.route_code,

                    "operator": row.operator,

                    "transport_type": row.transport_type,

                    "route": row.route,

                    "departure_point": row.departure_point,

                    "arrival_point": row.arrival_point,

                    "departure_time": row.departure_time,

                    "duration": row.duration,

                    "cost_npr": float(row.cost_npr)
                    if row.cost_npr is not None
                    else None
                })

            return result



        # -----------------------------
        # Final Response
        # -----------------------------
        return {

            "preference_id": preference_id,

            "starting_district": starting_district,

            "destination_district": destination_district,

            "outbound_transport": format_transport(outbound),

            "return_transport": format_transport(return_trip)

        }