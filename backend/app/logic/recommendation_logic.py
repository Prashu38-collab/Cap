from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from fastapi import HTTPException

from app.logic.recommender import ContentBasedRecommender

class RecommendationService:
    def __init__(self):
        # Initializes your core TF-IDF vectorizer class
        self.recommender = ContentBasedRecommender()

    def get_personalized_recommendations(self, db: Session, preference_id: int) -> List[Dict[str, Any]]:
        
        # 1. Fetch user preferences row to get the target district and interest categories
        pref_query = text("""
            SELECT district, category
            FROM public."User_Preferences"
            WHERE preference_id = :preference_id
            LIMIT 1
        """)
        pref_result = db.execute(pref_query, {"preference_id": preference_id}).fetchone()

        if not pref_result:
            raise HTTPException(status_code=404, detail="User preferences not found.")

        district = pref_result.district
        raw_categories = pref_result.category

        if not district:
            raise HTTPException(status_code=400, detail="District missing from preferences.")

        # Clean and tokenize interest categories into an array of strings (e.g., ['nature', 'religious'])
        user_interests = []
        if raw_categories:
            user_interests = [cat.strip().lower() for cat in raw_categories.replace(",", " ").split() if cat.strip()]

        # 2. Query ALL places belonging to that district
        places_query = """
        SELECT
            place_id, place_name, "District" AS district, "Latitude" AS latitude, 
            "Longitude" AS longitude, "Category" AS category, "Indoor_Outdoor" AS indoor_outdoor, 
            "Mobility" AS mobility, "Budget_level" AS budget_level, "Entry_Fee" AS entry_fee
        FROM itinerary_places
        WHERE "District" ILIKE :district
        """
        result = db.execute(text(places_query), {"district": f"%{district}%"})
        rows = result.fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail=f"No places found in district: {district}")

        # Convert SQL rows to raw Python dictionaries
        places_pool = [dict(row._mapping) for row in rows]

        # 3. Calculate pure TF-IDF & Cosine Similarity scores
        scored_places = self.recommender.compute_similarity(places_pool, user_interests)
        
        # 4. Return the pool sorted strictly from highest matching score to lowest
        return sorted(scored_places, key=lambda x: x['similarity_score'], reverse=True)