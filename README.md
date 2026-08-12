# Go Travel — Travel Itinerary Recommendation System

A full-stack web application that generates **personalized, day-by-day travel itineraries** for Nepal. It scores attractions against the user's preferences, plans route-aware daily schedules across districts, and adapts plans to real-time weather.

## Features

- **Personalized recommendations** — every attraction is scored (0–1) against the user's profile across category match, starting/ending district, budget, mobility, and entry fee.
- **Route-aware itinerary planning** — places are packed into days using real road distances and travel times between 41 districts (no more zigzagging).
- **Weather-aware itineraries** — checks a live 16-day forecast before generation. On bad-weather days the user can keep the original outdoor plan or swap to indoor alternatives.
- **Multi-level fallback** — if a day would end up empty, the system relaxes category filters, pulls nearby-district places, and finally generates leisure activities so no day is ever empty.
- **Trek itineraries** — static injected routes for multi-day treks with hotel stops.
- **Hotel planning & budget validation** — picks hotels per district within budget and rejects plans where the budget can't cover hotels and transport.
- **Live traffic & weather telemetry** — district weather updates and traffic-aware routing.
- **User accounts** — signup/login, profile management, saved itineraries.
- **Admin dashboard** — manage destinations and platform content.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, React Router 7, Leaflet / react-leaflet, Axios, SweetAlert2, Vite |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL (Supabase), raw SQL for reporting logic |
| External APIs | Open-Meteo (forecasts), Nominatim (geocoding), OSRM (routing), OpenWeather |
| Testing | Pytest |
| ML-style scoring | TF-IDF + cosine similarity (content-based recommender) |

## Architecture

```
Frontend (React/Vite)
      │  REST / JSON (Axios)
      ▼
Backend (FastAPI, app/main.py)
      │  routers/  →  logic/  →  services/
      ▼
PostgreSQL (Supabase)
```

### Backend layout (`backend/app/`)

- `main.py` — FastAPI app, CORS, router registration.
- `routers/` — HTTP endpoints: `auth`, `User_Preferences`, `itinerary`, `hotels`, `places`, `traffic`, `map`, `weather`, `weather_places`, `saved_itineraries`, `transport`, `admin`, `contact`.
- `logic/` — the core business logic:
  - `recommendation_logic.py` — weighted scoring engine (`get_ranked_places`).
  - `itinerary_engine.py` — master day-by-day planner (`generate_master_itinerary` / `build_itinerary`).
  - `recommender.py` — TF-IDF + cosine similarity content-based recommender.
  - `fallback_recommender.py` — multi-level fallback to fill empty days.
  - `transit_corridors.py` — road graph between 41 districts (distances, times, fares).
  - `hotel_logic.py`, `transport_logic.py`, `traffic_logic.py`, `map_logic.py`, `route_optimiser.py`, `return_route.py`, `trek_routes.py`.
  - `weather/` — `weather_service.py` (Open-Meteo fetching), `weather_rules.py` (good/bad day rules), `weather_adapter.py` (advisory + indoor fallback).
- `services/` — orchestrators: `itinerary_service.py` (master orchestrator), `osrm_service.py`, `map_service.py`, `cache_service.py`, `email_services.py`.
- `models/`, `schemas/` — ORM models and Pydantic schemas.
- `tasks/` — Celery + itinerary background tasks.
- `tests/` — pytest suites for weather and recommendation logic.

### Frontend layout (`Frontend/src/`)

- `pages/` — `Dashboard`, `PlanTrip`, `GenerateItinerary`, `RecommendedItinerary`, `Profile`, `Login`, `Signup`, `About`, `Contact`, `AdminDashboard`.
- `components/` — `HotelSelection`, `ItineraryResult`, `TrekItineraryResult`, `WeatherSection`, `RecommendedItineraries`, `PlanTripMap`, `MapSection`, `TravelCategories`, `Hero`, `Navbar`, `Footer`, `Feedback`, admin components.

## How a Recommended Itinerary Is Built

1. **Input** — user selects trip type, starting & ending district, days, budget, mobility, and preferred categories (`POST /itinerary/...`).
2. **Recommendation** — `get_ranked_places` filters places to the route corridor and scores each one (category 40%, district 20%, budget 20%, mobility 10%, free entry 10%); durations are normalized to hours.
3. **Planning** — `itinerary_engine` packs top-scored places into days using transit-corridor travel times, hotel plans, and per-day time budgets.
4. **Fallback** — `fallback_recommender` guarantees every day is filled.
5. **Weather layer** — before generation, `check_weather_advisory` checks the 16-day forecast; a bad day triggers a modal where the user picks **Continue Anyway** or **Weather-Aware** (swap outdoor → indoor on bad days only).
6. **Output** — day-by-day itinerary with hotels, places, timings, and transit.

## Key API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/login`, `/auth/signup` | Authentication |
| `POST` | `/itinerary/{id}/generate` | Generate itinerary (optional `weather_action`, `corridor_override`) |
| `POST` | `/itinerary/{id}/check-weather` | Weather advisory before generation |
| `GET/POST` | `/weather/...` | District weather telemetry and favorability |
| `GET/POST` | `/hotels`, `/places`, `/traffic`, `/map`, `/transport` | Supporting data endpoints |
| `GET/POST` | `/saved_itineraries` | Saved trip management |
| `GET/POST` | `/admin`, `/contact` | Admin & feedback |

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (Supabase instance or local)

### Backend

```bash
cd backend
python -m venv myvenv
source myvenv/bin/activate        # Windows: myvenv\Scripts\activate
pip install -r requirements.txt
# Set DATABASE_URL (see backend/app/database.py) — use an .env file, don't commit secrets
uvicorn app.main:app --reload     # http://localhost:8000
```

### Frontend

```bash
cd Frontend
npm install
npm run dev                       # http://localhost:5173
```

### Full stack (from repo root)

```bash
npm run dev    # runs backend (uvicorn) + frontend (vite) with concurrently
```

## Testing

```bash
cd backend
python -m pytest app/tests -v
```

Test suites cover `test_weather_rules`, `test_weather_service`, `test_weather_adapter`, and `test_recommendation_logic` (30+ tests, including starting/ending district bonus and no-double-count cases).

## Notes

- The 16-day forecast window means itineraries planned further ahead are generated normally (advisory skips them).
- "Continue Anyway" preserves the original outdoor plan; "Weather-Aware" only touches days flagged as bad weather.
