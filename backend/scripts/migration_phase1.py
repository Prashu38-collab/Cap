"""
Phase 1 DB Migration:
- Add elevation_meters to itinerary_places and hotels
- Add opening_time and closing_time to itinerary_places
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from sqlalchemy import text


def run_migration():
    db = SessionLocal()
    try:
        # 1. Add elevation_meters to itinerary_places
        cols = {
            c.column_name
            for c in db.execute(
                text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'itinerary_places'"
                )
            ).fetchall()
        }

        if "elevation_meters" not in cols:
            db.execute(
                text(
                    "ALTER TABLE itinerary_places ADD COLUMN elevation_meters INTEGER DEFAULT 0"
                )
            )
            print("+ Added elevation_meters to itinerary_places")
        else:
            print("= elevation_meters already exists in itinerary_places")

        if "opening_time" not in cols:
            db.execute(
                text(
                    "ALTER TABLE itinerary_places ADD COLUMN opening_time TIME DEFAULT '09:00:00'"
                )
            )
            print("+ Added opening_time to itinerary_places")
        else:
            print("= opening_time already exists in itinerary_places")

        if "closing_time" not in cols:
            db.execute(
                text(
                    "ALTER TABLE itinerary_places ADD COLUMN closing_time TIME DEFAULT '17:00:00'"
                )
            )
            print("+ Added closing_time to itinerary_places")
        else:
            print("= closing_time already exists in itinerary_places")

        # 2. Add elevation_meters to hotels
        hotel_cols = {
            c.column_name
            for c in db.execute(
                text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name = 'hotels'"
                )
            ).fetchall()
        }

        if "elevation_meters" not in hotel_cols:
            db.execute(
                text(
                    "ALTER TABLE hotels ADD COLUMN elevation_meters INTEGER DEFAULT 0"
                )
            )
            print("+ Added elevation_meters to hotels")
        else:
            print("= elevation_meters already exists in hotels")

        db.commit()
        print("Migration completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
