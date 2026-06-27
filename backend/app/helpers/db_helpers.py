from sqlalchemy import text
from sqlalchemy.orm import Session

from app.logic.recommender import PreferenceRecommender


def get_ranked_places(
    preference_id: int,
    db: Session
):

    recommender = PreferenceRecommender()

    pref_query = text("""
        SELECT
            district,
            category,
            budget_level,
            mobility,
            indoor_outdoor
        FROM "User_Preferences"
        WHERE preference_id = :id
    """)

    pref = db.execute(
        pref_query,
        {"id": preference_id}
    ).fetchone()

    if not pref:
        return []

    district = pref.district

    categories = []

    if pref.category:
        categories = [
            c.strip().lower()
            for c in pref.category.replace(",", " ").split()
            if c.strip()
        ]

    user_preferences = {
        "categories": categories,
        "budget_level": pref.budget_level,
        "mobility": pref.mobility,
        "indoor_outdoor": pref.indoor_outdoor
    }

    places_query = text("""
        SELECT
            place_id,
            place_name,
            "District" AS district,
            "Latitude" AS latitude,
            "Longitude" AS longitude,
            "Category" AS category,
            "Indoor_Outdoor" AS indoor_outdoor,
            "Mobility" AS mobility,
            "Budget_level" AS budget_level,
            "Entry_Fee" AS entry_fee,
            estimated_duration_value,
            estimated_duration_unit
        FROM itinerary_places
        WHERE "District" ILIKE :district
    """)

    rows = db.execute(
        places_query,
        {"district": f"%{district}%"}
    ).fetchall()

    places = [dict(r._mapping) for r in rows]

    ranked_places = recommender.compute_similarity(
        places,
        user_preferences
    )

    ranked_places.sort(
        key=lambda x: x["similarity_score"],
        reverse=True
    )

    return ranked_places

def _table_exists(db: Session, table_name: str) -> bool:
    query = text("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = :table_name
        )
    """)
    return bool(db.execute(query, {"table_name": table_name}).scalar())


def _table_columns(db: Session, table_name: str) -> List[str]:
    query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = :table_name
    """)
    return [row.column_name for row in db.execute(query, {"table_name": table_name}).fetchall()]



