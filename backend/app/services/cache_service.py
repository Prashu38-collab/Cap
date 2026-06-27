"""
Redis-based caching service with in-memory fallback.

Caches:
  - OSRM route results (TTL: 1 hour)
  - Weather data (TTL: 15 minutes)

If Redis is unavailable, falls back to an in-process dictionary cache.
This ensures the system never breaks due to caching infrastructure.
"""
import hashlib
import json
import time
import logging
from typing import Optional, Any, Dict
from datetime import timedelta

logger = logging.getLogger(__name__)

# Default TTLs
OSRM_CACHE_TTL = 3600       # 1 hour
WEATHER_CACHE_TTL = 900     # 15 minutes
DEFAULT_CACHE_TTL = 300     # 5 minutes

# In-memory fallback cache
_memory_cache: Dict[str, Dict] = {}
_memory_cache_enabled = True


class CacheService:
    """Redis-backed cache with automatic in-memory fallback."""

    def __init__(self, redis_url: Optional[str] = None):
        self.redis = None
        self._connect_redis(redis_url)

    def _connect_redis(self, redis_url: Optional[str]) -> None:
        """Attempt Redis connection. If it fails, we'll use memory cache."""
        if not redis_url:
            redis_url = "redis://localhost:6379/0"
        try:
            import redis as redis_module
            self.redis = redis_module.Redis.from_url(
                redis_url,
                socket_connect_timeout=2,
                socket_timeout=2,
                decode_responses=True,
            )
            self.redis.ping()
            logger.info("Redis connected at %s", redis_url)
        except Exception as e:
            self.redis = None
            logger.warning("Redis unavailable (%s). Using in-memory cache.", e)

    def _make_key(self, prefix: str, *parts: str) -> str:
        """Generate a cache key from prefix + hash of parts."""
        raw = ":".join(str(p) for p in parts)
        hashed = hashlib.md5(raw.encode()).hexdigest()
        return f"{prefix}:{hashed}"

    # ---- OSRM Route Cache ----

    def cache_osrm_route(self, coords_key: str, data: dict) -> None:
        """Cache an OSRM route result for 1 hour."""
        key = self._make_key("osrm_route", coords_key)
        self._set(key, json.dumps(data), OSRM_CACHE_TTL)

    def get_cached_osrm_route(self, coords_key: str) -> Optional[dict]:
        """Retrieve a cached OSRM route result."""
        key = self._make_key("osrm_route", coords_key)
        raw = self._get(key)
        if raw:
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                pass
        return None

    # ---- Weather Cache ----

    def cache_weather(self, district: str, date: str, data: list) -> None:
        """Cache weather forecast data for 15 minutes."""
        key = self._make_key("weather", district, date)
        self._set(key, json.dumps(data), WEATHER_CACHE_TTL)

    def get_cached_weather(self, district: str, date: str) -> Optional[list]:
        """Retrieve cached weather data."""
        key = self._make_key("weather", district, date)
        raw = self._get(key)
        if raw:
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                pass
        return None

    # ---- Intinerary Cache ----

    def cache_itinerary(self, preference_id: int, data: dict) -> None:
        """Cache a generated itinerary for 5 minutes (quick regeneration)."""
        key = self._make_key("itinerary", str(preference_id))
        self._set(key, json.dumps(data), DEFAULT_CACHE_TTL)

    def get_cached_itinerary(self, preference_id: int) -> Optional[dict]:
        """Retrieve a cached itinerary."""
        key = self._make_key("itinerary", str(preference_id))
        raw = self._get(key)
        if raw:
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                pass
        return None

    # ---- Generic cache operations with fallback ----

    def _set(self, key: str, value: str, ttl: int) -> None:
        """Set a cache value, trying Redis first, then memory."""
        if self.redis:
            try:
                self.redis.setex(key, ttl, value)
                return
            except Exception:
                pass
        # Fallback: in-memory
        if _memory_cache_enabled:
            _memory_cache[key] = {
                "value": value,
                "expires": time.time() + ttl,
            }

    def _get(self, key: str) -> Optional[str]:
        """Get a cache value, trying Redis first, then memory."""
        if self.redis:
            try:
                return self.redis.get(key)
            except Exception:
                pass
        # Fallback: in-memory
        entry = _memory_cache.get(key)
        if entry and time.time() < entry["expires"]:
            return entry["value"]
        _memory_cache.pop(key, None)
        return None

    def clear(self, pattern: Optional[str] = None) -> None:
        """Clear cache entries. If pattern is None, clears everything."""
        if self.redis:
            try:
                if pattern:
                    for key in self.redis.scan_iter(match=pattern):
                        self.redis.delete(key)
                else:
                    self.redis.flushdb()
            except Exception:
                pass
        # Clear memory cache
        if pattern:
            _memory_cache.clear()  # simple: clear all on pattern match
        else:
            _memory_cache.clear()


# Singleton instance for app-wide use
_cache_instance: Optional[CacheService] = None


def init_cache(redis_url: Optional[str] = None) -> CacheService:
    """Initialize the global cache singleton."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService(redis_url)
    return _cache_instance


def get_cache() -> CacheService:
    """Get the global cache singleton."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance
