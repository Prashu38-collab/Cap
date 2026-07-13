from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from app.database import get_db

import re

from app.schemas.admin_schema import (
    AdminCreateUser,
    StatusUpdate
)

from app.crud.admin_crud import (
    get_dashboard_stats,
    get_destinations_per_district,
    get_category_distribution,
    get_recent_messages
)

from app.crud.contact_crud import (
    get_all_messages,
    update_message_status,
    delete_message
)

from app.crud.user_crud import (
    get_all_users,
    get_user_by_email,
    create_user,
    delete_user,
    update_user_status
)

from app.crud.destination_crud import (
    get_all_destinations,
    get_destination_by_id,
    create_destination,
    update_destination,
    delete_destination
)

from app.schemas.destination_schema import (
    DestinationCreate,
    DestinationUpdate
)

from app.schemas.hotel_schema import (
    HotelCreate,
    HotelUpdate
)

from app.crud.hotel_crud import (
    get_all_hotels,
    get_hotel_by_id,
    create_hotel,
    update_hotel,
    delete_hotel
)

from app.crud.generated_itinerary_crud import (
    get_all_generated_itineraries,
    get_generated_itinerary_by_id,
    delete_generated_itinerary
)

from app.crud.admin_activity_crud import (
    get_recent_admin_activities
)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)

# Pydantic Model
class MessageStatus(BaseModel):
    status: str

# ------------------------------------------------DASHBOARD-----------------------------------------

# DASHBOARD STATISTICS

@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db)
):
    return get_dashboard_stats(db)

# DASHBOARD DISTRICT CHART

@router.get("/dashboard/districts")
def dashboard_districts(
    db: Session = Depends(get_db)
):
    return get_destinations_per_district(db)

# CATEGORY DISTRIBUTION

@router.get("/dashboard/category-distribution")
def dashboard_category_distribution(
    db: Session = Depends(get_db)
):
    return get_category_distribution(db)

# RECENT MESSAGES

@router.get("/dashboard/recent-messages")
def dashboard_recent_messages(
    db: Session = Depends(get_db)
):
    return get_recent_messages(db)

# RECENT ACTIVITIES
@router.get("/dashboard/recent-activities")
def dashboard_recent_activities(
    db: Session = Depends(get_db)
):
    return get_recent_admin_activities(db)


# -----------------------------------------------------------USERS-------------------------------------------------------------------

# GET ALL USERS

@router.get("/users")
def get_users(
    db: Session = Depends(get_db)
):

    users = get_all_users(db)

    return [
        {
            "id": user.user_id,
            "name": user.name,
            "email": user.email,
            "phone_number": user.phone_number,
            "status": user.status
        }
        for user in users
    ]


# CREATE USER

@router.post("/users")
def add_user(
    user: AdminCreateUser,
    db: Session = Depends(get_db)
):

    # Name Validation

    if len(user.name.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Name must contain at least 3 characters."
        )

    # Phone Validation

    if not re.fullmatch(r"\d{10}", user.phone_number):
        raise HTTPException(
            status_code=400,
            detail="Phone number must contain exactly 10 digits."
        )

    # Password Validation

    password = user.password

    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters."
        )

    if len(password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password is too long."
        )

    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one uppercase letter."
        )

    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one lowercase letter."
        )

    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one number."
        )

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain one special character."
        )

    # Duplicate Email

    existing = get_user_by_email(
        db,
        user.email
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already exists."
        )

    # Hash Password

    hashed_password = pwd_context.hash(password)

    # Create User

    create_user(
        db=db,
        name=user.name,
        email=user.email,
        phone_number=user.phone_number,
        hashed_password=hashed_password,
        terms_accepted=True,
        confirm_password=password,
        otp=None,
        otp_expiry=None
    )

    created_user = get_user_by_email(
        db,
        user.email
    )

    update_user_status(
        db,
        created_user.user_id,
        "Active"
    )

    return {
        "message": "User created successfully."
    }

# DELETE USER

@router.delete("/users/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db)
):

    success = delete_user(
        db,
        user_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "message": "User deleted successfully."
    }


# UPDATE USER STATUS

@router.put("/users/{user_id}/status")
def change_status(
    user_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db)
):

    if data.status not in [
        "Active",
        "Inactive",
        "Locked"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status."
        )

    success = update_user_status(
        db,
        user_id,
        data.status
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="User not found."
        )

    return {
        "message": f"User status updated to {data.status}."
    }


# ------------------------------------------------------------MESSAGES-------------------------------------------------------------

# GET ALL CONTACT MESSAGES

@router.get("/messages")
def admin_get_messages(
    db: Session = Depends(get_db)
):

    rows = get_all_messages(db)

    return [
        {
            "message_id": row.message_id,
            "name": row.name,
            "email": row.email,
            "phone": row.phone,
            "subject": row.subject,
            "message": row.message,
            "status": row.status,
            "created_at": row.created_at
        }
        for row in rows
    ]


# UPDATE MESSAGE STATUS

@router.put("/messages/{message_id}/read")
def admin_update_message_status(
    message_id: int,
    # data: MessageStatus,
    db: Session = Depends(get_db)
):

    success = update_message_status(
        db=db,
        message_id=message_id,
        status="Read"
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Message not found."
        )

    return {
        "message":"Message updated successfully."
    }


# DELETE MESSAGE

@router.delete("/messages/{message_id}")
def admin_delete_message(
    message_id:int,
    db:Session=Depends(get_db)
):

    success=delete_message(
        db,
        message_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Message not found."
        )

    return{
        "message":"Message deleted successfully."
    }


# -----------------------------------------------DESTINATIONS------------------------------------------------------
# GET ALL DESTINATIONS

@router.get("/destinations")
def admin_get_destinations(
    db: Session = Depends(get_db)
):

    destinations = get_all_destinations(db)

    return [
        {
            "place_id": d.place_id,
            "place_name": d.place_name,
            "District": d.District,
            "Latitude": d.Latitude,
            "Longitude": d.Longitude,
            "Category": d.Category,
            "Indoor_Outdoor": d.Indoor_Outdoor,
            "Mobility": d.Mobility,
            "Weather_Sensitivity": d.Weather_Sensitivity,
            "Budget_level": d.Budget_level,
            "Entry_Fee": d.Entry_Fee,
            "province": d.province,
            "estimated_duration_value": d.estimated_duration_value,
            "estimated_duration_unit": d.estimated_duration_unit,
            "is_trek": d.is_trek,
            "elevation_meters": d.elevation_meters,
            "opening_time": d.opening_time,
            "closing_time": d.closing_time
        }
        for d in destinations
    ]

# GET ONE DESTINATION

@router.get("/destinations/{place_id}")
def admin_get_destination(
    place_id: int,
    db: Session = Depends(get_db)
):
    destination = get_destination_by_id(db, place_id)

    if not destination:
        raise HTTPException(
            status_code=404,
            detail="Destination not found."
        )

    return {
    "place_id": destination.place_id,
    "place_name": destination.place_name,
    "District": destination.District,
    "Latitude": destination.Latitude,
    "Longitude": destination.Longitude,
    "Category": destination.Category,
    "Indoor_Outdoor": destination.Indoor_Outdoor,
    "Mobility": destination.Mobility,
    "Weather_Sensitivity": destination.Weather_Sensitivity,
    "Budget_level": destination.Budget_level,
    "Entry_Fee": destination.Entry_Fee,
    "province": destination.province,
    "estimated_duration_value": destination.estimated_duration_value,
    "estimated_duration_unit": destination.estimated_duration_unit,
    "is_trek": destination.is_trek,
    "elevation_meters": destination.elevation_meters,
    "opening_time": destination.opening_time,
    "closing_time": destination.closing_time
}

# ADD DESTINATION

@router.post("/destinations")
def admin_add_destination(
    destination: DestinationCreate,
    db: Session = Depends(get_db)
):
    create_destination(
        db,
        destination
    )

    return {
        "message": "Destination added successfully."
    }

# UPDATE DESTINATION

@router.put("/destinations/{place_id}")
def admin_update_destination(
    place_id: int,
    destination: DestinationUpdate,
    db: Session = Depends(get_db)
):
    success = update_destination(
        db,
        place_id,
        destination
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Destination not found."
        )

    return {
        "message": "Destination updated successfully."
    }

# DELETE DESTINATION

@router.delete("/destinations/{place_id}")
def admin_delete_destination(
    place_id: int,
    db: Session = Depends(get_db)
):
    success = delete_destination(
        db,
        place_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Destination not found."
        )

    return {
        "message": "Destination deleted successfully."
    }


# -------------------------------------------------HOTELS--------------------------------------------------

# GET ALL HOTELS

@router.get("/hotels")
def admin_get_hotels(
    db: Session = Depends(get_db)
):

    return get_all_hotels(db)


# GET HOTEL

@router.get("/hotels/{hotel_id}")
def admin_get_hotel(
    hotel_id: int,
    db: Session = Depends(get_db)
):

    hotel = get_hotel_by_id(
        db,
        hotel_id
    )

    if not hotel:
        raise HTTPException(
            status_code=404,
            detail="Hotel not found."
        )

    return hotel


# ADD HOTEL

@router.post("/hotels")
def admin_add_hotel(
    hotel: HotelCreate,
    db: Session = Depends(get_db)
):

    if hotel.review_score < 0 or hotel.review_score > 5:
        raise HTTPException(
            status_code=400,
            detail="Review score must be between 0 and 5."
        )

    if hotel.budget < 0:
        raise HTTPException(
            status_code=400,
            detail="Budget cannot be negative."
        )

    create_hotel(
        db,
        hotel
    )

    return {
        "message": "Hotel added successfully."
    }


# UPDATE HOTEL

@router.put("/hotels/{hotel_id}")
def admin_update_hotel(
    hotel_id: int,
    hotel: HotelUpdate,
    db: Session = Depends(get_db)
):

    if hotel.review_score < 0 or hotel.review_score > 5:
        raise HTTPException(
            status_code=400,
            detail="Review score must be between 0 and 5."
        )

    success = update_hotel(
        db,
        hotel_id,
        hotel
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Hotel not found."
        )

    return {
        "message": "Hotel updated successfully."
    }


# DELETE HOTEL

@router.delete("/hotels/{hotel_id}")
def admin_delete_hotel(
    hotel_id: int,
    db: Session = Depends(get_db)
):

    success = delete_hotel(
        db,
        hotel_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Hotel not found."
        )

    return {
        "message": "Hotel deleted successfully."
    }


# ------------------------------------------GENERATED ITINERARIES-----------------------------------------

# GET ALL GENERATED ITINERARIES

@router.get("/generated-itineraries")
def admin_get_generated_itineraries(
    db: Session = Depends(get_db)
):
    return get_all_generated_itineraries(db)

# GET ONE GENERATED ITINERARY

@router.get("/generated-itineraries/{itinerary_id}")
def admin_get_generated_itinerary(
    itinerary_id: int,
    db: Session = Depends(get_db)
):
    itinerary = get_generated_itinerary_by_id(
        db,
        itinerary_id
    )

    if not itinerary:
        raise HTTPException(
            status_code=404,
            detail="Generated itinerary not found."
        )

    return itinerary

# DELETE GENERATED ITINERARY

@router.delete("/generated-itineraries/{itinerary_id}")
def admin_delete_generated_itinerary(
    itinerary_id: int,
    db: Session = Depends(get_db)
):
    success = delete_generated_itinerary(
        db,
        itinerary_id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Generated itinerary not found."
        )

    return {
        "message": "Generated itinerary deleted successfully."
    }
