from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone_number: str
    password: str
    confirm_password: str
    terms_accepted: bool

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone_number: str
    status: str

    class Config:
        from_attributes = True