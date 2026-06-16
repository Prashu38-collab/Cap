from fastapi import APIRouter

router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)


@router.get("/")
def get_trips():
    return {
        "message": "List of trips"
    }


@router.post("/create")
def create_trip():
    return {
        "message": "Trip created successfully"
    }