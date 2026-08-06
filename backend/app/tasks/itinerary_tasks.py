"""
Celery background tasks for itinerary generation.

Usage:
    celery -A app.tasks.itinerary_tasks worker --loglevel=info

If Celery/Redis is unavailable, tasks run synchronously (blocking).
"""
import json
import logging
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import SessionLocal
from app.logic.itinerary_engine import build_itinerary
from app.logic.weather.weather_service import WeatherService
from app.tasks.celery_app import get_celery_app, is_celery_available

logger = logging.getLogger(__name__)

celery = get_celery_app()


def _generate_itinerary_sync(preference_id: int) -> dict:
    """Generate itinerary synchronously (used when Celery is unavailable)."""
    db = SessionLocal()
    try:
        result = build_itinerary(db, preference_id)

        pref = db.execute(
            text(""" SELECT * FROM "User_Preferences" WHERE preference_id = :pid """),
            {"pid": preference_id},
        ).fetchone()

        if pref:
            district = str(getattr(pref, "starting_district", "Kathmandu")).strip().title()
            travel_date = getattr(pref, "travel_date", None)
            travel_days = int(getattr(pref, "travel_days", 1))
            if travel_date:
                try:
                    weather = WeatherService.get_weather_flags_from_db(
                        db, district, str(travel_date), travel_days
                    )
                    result["weather_forecast"] = weather
                except Exception:
                    result["weather_forecast"] = []

        return result
    finally:
        db.close()


# Register the Celery task if Celery is available
if celery is not None:

    @celery.task(bind=True, name="generate_itinerary")
    def generate_itinerary_task(self, preference_id: int) -> dict:
        """Background task: generate itinerary for a preference.

        Updates task state so the /status endpoint can track progress.
        """
        self.update_state(state="PROGRESS", meta={"status": "Generating itinerary..."})

        db = SessionLocal()
        try:
            # Get the preference
            pref = db.execute(
                text(""" SELECT * FROM "User_Preferences" WHERE preference_id = :pid """),
                {"pid": preference_id},
            ).fetchone()

            if not pref:
                raise ValueError(f"Preference {preference_id} not found")

            self.update_state(state="PROGRESS", meta={"status": "Scoring and ranking places..."})

            result = build_itinerary(db, preference_id)

            self.update_state(state="PROGRESS", meta={"status": "Checking weather conditions..."})

            district = str(getattr(pref, "starting_district", "Kathmandu")).strip().title()
            travel_date = getattr(pref, "travel_date", None)
            travel_days = int(getattr(pref, "travel_days", 1))

            if travel_date:
                try:
                    weather = WeatherService.get_weather_flags_from_db(
                        db, district, str(travel_date), travel_days
                    )
                    result["weather_forecast"] = weather
                except Exception:
                    result["weather_forecast"] = []

            return result
        finally:
            db.close()

else:

    def generate_itinerary_task(preference_id: int) -> dict:
        """Synchronous fallback when Celery is unavailable."""
        return _generate_itinerary_sync(preference_id)


def run_itinerary_task(preference_id: int) -> dict:
    """Run itinerary generation, returning either a Celery AsyncResult or sync result.

    Returns:
        If Celery is available: {"task_id": "...", "status": "queued"}
        If Celery is unavailable: the full result dict directly.
    """
    try:
        if is_celery_available() and celery is not None:
            task = generate_itinerary_task.delay(preference_id)
            return {"task_id": task.id, "status": "queued"}
    except Exception:
        logger.warning("Celery task submission failed. Running synchronously.")

    result = _generate_itinerary_sync(preference_id)
    return {"status": "completed", "data": result}
