from fastapi import APIRouter
from app.logic.transport_logic import get_transport_for_user

router = APIRouter(
    prefix="/transport",
    tags=["Transport"]
)


@router.get("/user/{user_id}")
def transport_by_user(user_id: int):

    transport = get_transport_for_user(user_id)

    return {
        "user_id": user_id,
        "transport_options": transport
    }