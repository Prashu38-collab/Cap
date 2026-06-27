import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict


def save_itinerary(
    db: Session,
    preference_id: int,
    itinerary_data: dict,
    status: str = "generated",
    total_estimated_cost: Optional[float] = None,
) -> int:
    """Insert a new saved itinerary record. Returns the new itinerary_id."""
    max_id = db.execute(
        text('SELECT COALESCE(MAX(itinerary_id), 0) + 1 FROM generated_itineraries')
    ).scalar()

    days = len(itinerary_data.get("itinerary", []))

    db.execute(
        text("""
            INSERT INTO generated_itineraries (
                itinerary_id, preference_id, status,
                total_estimated_cost, total_travel_days_used,
                required_days, user_days, generated_at, itinerary_data
            ) VALUES (
                :iid, :pid, :status,
                :cost, :days_used,
                :req_days, :user_days, :gen_at,
                CAST(:data AS jsonb)
            )
        """),
        {
            "iid": max_id,
            "pid": preference_id,
            "status": status,
            "cost": total_estimated_cost or 0.0,
            "days_used": days,
            "req_days": days,
            "user_days": days,
            "gen_at": datetime.now(timezone.utc),
            "data": json.dumps(itinerary_data),
        },
    )
    db.commit()
    return max_id


def get_saved_itineraries(
    db: Session,
    preference_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict]:
    """List saved itineraries, optionally filtered by preference_id."""
    conditions = []
    params = {"lim": limit, "off": offset}

    if preference_id is not None:
        conditions.append("preference_id = :pid")
        params["pid"] = preference_id

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    rows = db.execute(
        text(f"""
            SELECT itinerary_id, preference_id, status,
                   total_estimated_cost, total_travel_days_used,
                   generated_at
            FROM generated_itineraries
            {where_clause}
            ORDER BY generated_at DESC
            LIMIT :lim OFFSET :off
        """),
        params,
    ).fetchall()

    return [
        {
            "itinerary_id": r.itinerary_id,
            "preference_id": r.preference_id,
            "status": r.status,
            "total_estimated_cost": float(r.total_estimated_cost) if r.total_estimated_cost else 0.0,
            "total_travel_days_used": r.total_travel_days_used,
            "generated_at": str(r.generated_at) if r.generated_at else None,
        }
        for r in rows
    ]


def get_saved_itinerary_by_id(db: Session, itinerary_id: int) -> Optional[Dict]:
    """Get a single saved itinerary with full data."""
    row = db.execute(
        text("""
            SELECT itinerary_id, preference_id, status,
                   total_estimated_cost, total_travel_days_used,
                   required_days, user_days, generated_at, itinerary_data
            FROM generated_itineraries
            WHERE itinerary_id = :iid
        """),
        {"iid": itinerary_id},
    ).fetchone()

    if not row:
        return None

    return {
        "itinerary_id": row.itinerary_id,
        "preference_id": row.preference_id,
        "status": row.status,
        "total_estimated_cost": float(row.total_estimated_cost) if row.total_estimated_cost else 0.0,
        "total_travel_days_used": row.total_travel_days_used,
        "required_days": row.required_days,
        "user_days": row.user_days,
        "generated_at": str(row.generated_at) if row.generated_at else None,
        "itinerary_data": row.itinerary_data if hasattr(row, 'itinerary_data') else None,
    }


def update_saved_itinerary(
    db: Session,
    itinerary_id: int,
    status: Optional[str] = None,
    itinerary_data: Optional[dict] = None,
) -> bool:
    """Update a saved itinerary. Returns True if updated, False if not found."""
    existing = db.execute(
        text("SELECT itinerary_id FROM generated_itineraries WHERE itinerary_id = :iid"),
        {"iid": itinerary_id},
    ).fetchone()

    if not existing:
        return False

    sets = []
    params = {"iid": itinerary_id}

    if status is not None:
        sets.append("status = :status")
        params["status"] = status
    if itinerary_data is not None:
        sets.append("itinerary_data = CAST(:data AS jsonb)")
        params["data"] = json.dumps(itinerary_data)
        days = len(itinerary_data.get("itinerary", []))
        sets.append("total_travel_days_used = :days")
        params["days"] = days

    if not sets:
        return True

    db.execute(
        text(f"UPDATE generated_itineraries SET {', '.join(sets)} WHERE itinerary_id = :iid"),
        params,
    )
    db.commit()
    return True


def delete_saved_itinerary(db: Session, itinerary_id: int) -> bool:
    """Delete a saved itinerary. Returns True if deleted, False if not found."""
    result = db.execute(
        text("DELETE FROM generated_itineraries WHERE itinerary_id = :iid"),
        {"iid": itinerary_id},
    )
    db.commit()
    return result.rowcount > 0
