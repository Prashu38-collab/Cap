from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any, Optional


class RecommendationService:

    def get_ranked_places(self, db: Session, preference_id: int, districts_override: Optional[list] = None):

        # ----------------------------
        # USER PREFERENCES
        # ----------------------------
        pref_query = text("""
            SELECT *
            FROM "User_Preferences"
            WHERE preference_id = :id
        """)

        pref = db.execute(pref_query, {"id": preference_id}).fetchone()

        if not pref:
            return []

        # ----------------------------
        # SAFE PARSER
        # ----------------------------
        def parse_list(val):
            if not val:
                return []
            if isinstance(val, list):
                return [v.lower() for v in val]
            return [x.strip().lower() for x in str(val).split(",")]

        preferred_categories = parse_list(getattr(pref, "preferred_categories", None))
        budget = (getattr(pref, "budget_level", "") or "").lower()
        mobility = (getattr(pref, "mobility", "") or "").lower()
        district = (getattr(pref, "starting_district", "") or getattr(pref, "district", "") or "").lower()

        # Support multi-district via districts_override
        search_districts = districts_override if districts_override else ([district] if district else [])

        # ----------------------------
        # GET PLACES (FILTERED BY DISTRICT(S))
        # ----------------------------
        query_str = """
            SELECT
                place_id,
                place_name,
                "District" AS district,
                "Latitude" AS latitude,
                "Longitude" AS longitude,
                "Category" AS category,
                "Mobility" AS mobility,
                "Budget_level" AS budget_level,
                "Entry_Fee" AS entry_fee,
                estimated_duration_value AS raw_duration_value,
                estimated_duration_unit AS raw_duration_unit,
                is_trek,
                "Indoor_Outdoor" AS indoor_outdoor,
                "Weather_Sensitivity" AS weather_sensitivity,
                opening_time,
                closing_time,
                elevation_meters
            FROM itinerary_places
        """
        
        params = {}
        
        if search_districts:
            conditions = []
            for i, d in enumerate(search_districts):
                p = f"dist_{i}"
                conditions.append(f""" "District" ILIKE :{p} """)
                params[p] = f"%{d}%"
            query_str += " WHERE " + " OR ".join(conditions)

        query = text(query_str)
        rows = db.execute(query, params).fetchall()

        ranked = []

        # ----------------------------
        # SCORING ENGINE
        # ----------------------------
        for r in rows:

            score = 0.0

            cat = (r.category or "").lower()
            dist = (r.district or "").lower()
            bud = (r.budget_level or "").lower()
            mob = (r.mobility or "").lower()
            fee = (r.entry_fee or "").lower()

            # CATEGORY (40%)
            if preferred_categories:
                if any(c in cat for c in preferred_categories):
                    score += 0.40
                else:
                    score += 0.05

            # DISTRICT (20%)
            if district and district in dist:
                score += 0.20

            # BUDGET (20%)
            if budget and budget == bud:
                score += 0.20

            # MOBILITY (10%)
            if mobility and mobility == mob:
                score += 0.10

            # ENTRY FEE (10%)
            if "free" in fee:
                score += 0.10

            score = round(min(score, 1.0), 4)

            raw_val = float(r.raw_duration_value) if r.raw_duration_value else 2.0
            raw_unit = (r.raw_duration_unit or "hours").lower()
            # Convert all duration values to hours
            if "day" in raw_unit:
                dur_hours = raw_val * 8.0  # 1 day = 8 hours
            elif "minute" in raw_unit or "min" in raw_unit:
                dur_hours = raw_val / 60.0  # convert minutes to hours
            else:
                dur_hours = raw_val  # already in hours

            ranked.append({
                "place_id": r.place_id,
                "place_name": r.place_name,
                "district": r.district,
                "latitude": float(r.latitude),
                "longitude": float(r.longitude),
                "category": r.category,
                "mobility": r.mobility,
                "budget_level": r.budget_level,
                "entry_fee": r.entry_fee,
                "similarity_score": score,
                "duration_hours": dur_hours,
                "raw_duration_value": raw_val,
                "raw_duration_unit": raw_unit,
                "is_trek": bool(r.is_trek) if r.is_trek is not None else False,
                "indoor_outdoor": (r.indoor_outdoor or "Outdoor").lower(),
                "weather_sensitivity": (r.weather_sensitivity or "No").lower(),
                "opening_time": str(r.opening_time) if r.opening_time else None,
                "closing_time": str(r.closing_time) if r.closing_time else None,
                "elevation_meters": float(r.elevation_meters) if r.elevation_meters else None,
            })

        ranked.sort(key=lambda x: x["similarity_score"], reverse=True)

        return ranked
    

    # yo chai ktm matra aauxa 
    # from sqlalchemy.orm import Session
# from sqlalchemy import text
# from typing import List, Dict, Any


# class RecommendationService:

#     def get_ranked_places(self, db: Session, preference_id: int):

  
#         # USER PREFERENCES
      
#         pref_query = text("""
#             SELECT *
#             FROM "User_Preferences"
#             WHERE preference_id = :id
#         """)

#         pref = db.execute(pref_query, {"id": preference_id}).fetchone()

#         if not pref:
#             return []

#         # ----------------------------
#         # SAFE PARSER
#         # ----------------------------
#         def parse_list(val):
#             if not val:
#                 return []
#             if isinstance(val, list):
#                 return [v.lower() for v in val]
#             return [x.strip().lower() for x in str(val).split(",")]

#         preferred_categories = parse_list(getattr(pref, "preferred_categories", None))
#         budget = (getattr(pref, "budget_level", "") or "").lower()
#         mobility = (getattr(pref, "mobility", "") or "").lower()
#         district = (getattr(pref, "starting_district", "") or getattr(pref, "district", "") or "").lower()

#         # ----------------------------
#         # GET PLACES
#         # ----------------------------
#         query = text("""
#             SELECT
#                 place_id,
#                 place_name,
#                 "District" AS district,
#                 "Latitude" AS latitude,
#                 "Longitude" AS longitude,
#                 "Category" AS category,
#                 "Mobility" AS mobility,
#                 "Budget_level" AS budget_level,
#                 "Entry_Fee" AS entry_fee
#             FROM itinerary_places
#         """)

#         rows = db.execute(query).fetchall()

#         ranked = []

#         # ----------------------------
#         # SCORING ENGINE
#         # ----------------------------
#         for r in rows:

#             score = 0.0

#             cat = (r.category or "").lower()
#             dist = (r.district or "").lower()
#             bud = (r.budget_level or "").lower()
#             mob = (r.mobility or "").lower()
#             fee = (r.entry_fee or "").lower()

#             # CATEGORY (40%)
#             if preferred_categories:
#                 if any(c in cat for c in preferred_categories):
#                     score += 0.40
#                 else:
#                     score += 0.05

#             # DISTRICT (20%)
#             if district and district in dist:
#                 score += 0.20

#             # BUDGET (20%)
#             if budget and budget == bud:
#                 score += 0.20

#             # MOBILITY (10%)
#             if mobility and mobility == mob:
#                 score += 0.10

#             # ENTRY FEE (10%)
#             if "free" in fee:
#                 score += 0.10

#             score = round(min(score, 1.0), 4)

#             ranked.append({
#                 "place_id": r.place_id,
#                 "place_name": r.place_name,
#                 "district": r.district,
#                 "latitude": float(r.latitude),
#                 "longitude": float(r.longitude),
#                 "category": r.category,
#                 "mobility": r.mobility,
#                 "budget_level": r.budget_level,
#                 "entry_fee": r.entry_fee,
#                 "similarity_score": score
#             })

#         ranked.sort(key=lambda x: x["similarity_score"], reverse=True)

#         return ranked