from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import User_Preferences, auth,hotels, itinerary, weather,weather_places, traffic, places, map, admin, contact

app = FastAPI(
    title="Travel Itinerary System API",
    description="Backend API for personalized travel itinerary planning",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
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

app.include_router(traffic.router)
app.include_router(places.router)
app.include_router(map.router)

app.include_router(admin.router)
app.include_router(contact.router)

app.include_router(saved_itineraries.router)


@app.get("/")
def home():
    return {
        "message": "Welcome to Travel Itinerary System API"
    }