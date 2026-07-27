from pydantic import BaseModel, Field, field_validator
import re

class ProfileUpdate(BaseModel):
    name: str
    phone_number: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if len(value) < 2:
            raise ValueError("Name must contain at least 2 characters.")

        if not re.fullmatch(r"[A-Za-z ]+", value):
            raise ValueError("Name can contain only alphabets and spaces.")

        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value):

        if not value.isdigit():
            raise ValueError("Phone number must contain digits only.")

        if len(value) != 10:
            raise ValueError("Phone number must contain exactly 10 digits.")

        return value


class ChangePassword(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value):

        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")

        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain uppercase letter.")

        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain lowercase letter.")

        if not re.search(r"\d", value):
            raise ValueError("Password must contain one number.")

        if not re.search(r"[!@#$%^&*()_\-+=\[\]{}|\\:;\"'<>,.?/]", value):
            raise ValueError("Password must contain one special character.")

        return value