from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import User_Preferences, auth,hotels, itinerary, weather,weather_places, traffic, places, map, admin, contact

app = FastAPI(
    title="Travel Itinerary System API",
    description="Backend API for personalized travel itinerary planning",
    version="1.0.0"
)

# CORS

origins = [
    "http://localhost:5173",   # React (Vite)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers 
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