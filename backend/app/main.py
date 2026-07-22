from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import threading
from app.routers import User_Preferences, auth,hotels, itinerary, weather,weather_places, traffic, places, map, admin, contact


def start_weather_scheduler():
    import time
    from app.database import SessionLocal
    from app.logic.weather_logic import refresh_all_weather

    while True:
        try:
            db = SessionLocal()
            refresh_all_weather(db)
            db.close()
        except Exception as e:
            print(f"Weather scheduler error: {e}")
        time.sleep(2 * 60 * 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=start_weather_scheduler, daemon=True)
    thread.start()
    yield


app = FastAPI(
    title="Travel Itinerary System API",
    description="Backend API for personalized travel itinerary planning",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS

origins = [
    "http://localhost:5173",   # React (Vite)
]

app.add_middleware(
    CORSMiddleware,
    # allow_origins=origins,
    allow_origins=["http://localhost:5173"],
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