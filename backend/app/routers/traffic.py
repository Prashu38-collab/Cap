from fastapi import APIRouter

router = APIRouter(
    prefix="/traffic",
    tags=["Traffic"]
)

@router.get("/")
def get_traffic():
    return {"message": "Traffic module working"}