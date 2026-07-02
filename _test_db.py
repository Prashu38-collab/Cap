import sys; sys.path.insert(0, 'backend')
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    rows = db.execute(text("SELECT preference_id, starting_district, ending_district, travel_days FROM \"User_Preferences\" LIMIT 3")).fetchall()
    for r in rows:
        print(f"pref_id={r.preference_id}, start={r.starting_district}, end={r.ending_district}, days={r.travel_days}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
