from pydantic import BaseModel, EmailStr

# Admin Login
class AdminLogin(BaseModel):
    email: EmailStr
    password: str

# Create User (Admin)
class AdminCreateUser(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    password: str


# Update User Status
class StatusUpdate(BaseModel):
    status: str