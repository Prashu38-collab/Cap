from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import User_Preferences, auth,hotels, itinerary, weather,weather_places, traffic, places, map, admin, contact

from app.security.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

app = FastAPI(
    title="Travel Itinerary System API",
    description="Backend API for personalized travel itinerary planning",
    version="1.0.0"
)

# configure limiter
app.state.limiter = limiter
# catch exception and return error
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)
#  add middleware
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers 
app.include_router(auth.router)
app.include_router(User_Preferences.router)

app.include_router(hotels.router)
app.include_router(itinerary.router)
app.include_router(weather_places.router)
app.include_router(weather.router)
app.include_router(traffic.router)
app.include_router(places.router)
app.include_router(map.router)

app.include_router(admin.router)
app.include_router(contact.router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Travel Itinerary System API"
    }