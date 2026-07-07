"""
Celery application configuration.

Kept in a separate module to avoid circular imports.
Gracefully handles missing Redis broker by providing a no-op fallback.
"""
import logging
import os

logger = logging.getLogger(__name__)

# Allow override via environment variable
BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
BACKEND_URL = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

celery_app = None
_celery_enabled = False


def get_celery_app():
    """Get the Celery application instance. Returns None if unavailable."""
    global celery_app, _celery_enabled

    if _celery_enabled:
        return celery_app

    try:
        from celery import Celery

        app = Celery(
            "travel_itinerary",
            broker=BROKER_URL,
            backend=BACKEND_URL,
        )
        app.conf.update(
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
            timezone="Asia/Kathmandu",
            enable_utc=True,
            task_track_started=True,
            task_acks_late=True,
            worker_prefetch_multiplier=1,
            task_soft_time_limit=300,  # 5 min soft limit
            task_time_limit=600,       # 10 min hard limit
        )
        celery_app = app
        _celery_enabled = True
        logger.info("Celery app initialized (broker: %s)", BROKER_URL)
        return app
    except Exception as e:
        logger.warning("Celery unavailable (%s). Running synchronously.", e)
        _celery_enabled = False
        return None


def is_celery_available() -> bool:
    """Check if Celery is configured and available.

    Actively probes the Redis broker to confirm it's reachable.
    """
    global _celery_enabled

    if not _celery_enabled:
        get_celery_app()

    if not _celery_enabled or celery_app is None:
        return False

    # Verify the broker is actually reachable
    try:
        import redis as redis_module
        conn = redis_module.Redis.from_url(
            BROKER_URL,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        conn.ping()
        return True
    except Exception:
        _celery_enabled = False
        logger.info("Celery broker unreachable. Falling back to synchronous mode.")
        return False
