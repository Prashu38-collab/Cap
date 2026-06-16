from fastapi import APIRouter

router = APIRouter(
    prefix="/map",
    tags=["Map"]
)

@router.get("/")
def get_map():
    return {"message": "Map module working"}