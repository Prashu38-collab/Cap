from conftest import client
from unittest.mock import patch


# ======================================================
# REGISTER TESTS
# ======================================================

@patch("app.routers.auth.send_otp_email", return_value=True)
def test_register_success(mock_email):
    response = client.post(
        "/register",
        json={
            "name": "Test User",
            "email": "newtestuser999@gmail.com",
            "phone_number": "9800000001",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "terms_accepted": True
        }
    )

    print(response.json())

    assert response.status_code == 201
    assert response.json()["success"] is True


def test_duplicate_email():

    response = client.post(
        "/register",
        json={
            "name": "Duplicate User",
            "email": "newtestuser999@gmail.com",
            "phone_number": "9800000002",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "terms_accepted": True
        }
    )

    print(response.json())

    assert response.status_code == 400
    assert response.json()["detail"] == "Email is already registered."



def test_duplicate_phone():

    response = client.post(
        "/register",
        json={
            "name": "Phone Duplicate",
            "email": "phonecheck@gmail.com",
            "phone_number": "9800000001",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "terms_accepted": True
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Phone number is already registered."



def test_invalid_password():

    response = client.post(
        "/register",
        json={
            "name": "Invalid Password",
            "email": "invalidpass@gmail.com",
            "phone_number": "9800000003",
            "password": "abc",
            "confirm_password": "abc",
            "terms_accepted": True
        }
    )

    assert response.status_code == 422



def test_password_mismatch():

    response = client.post(
        "/register",
        json={
            "name": "Mismatch",
            "email": "mismatch@gmail.com",
            "phone_number": "9800000004",
            "password": "Password@123",
            "confirm_password": "Password@456",
            "terms_accepted": True
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Passwords do not match."



def test_terms_not_accepted():

    response = client.post(
        "/register",
        json={
            "name": "No Terms",
            "email": "noterms@gmail.com",
            "phone_number": "9800000005",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "terms_accepted": False
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "You must accept the Terms & Conditions."



# ======================================================
# OTP VERIFICATION TESTS
# ======================================================

def test_verify_invalid_otp():

    response = client.post(
        "/verify-otp",
        json={
            "email": "newtestuser999@gmail.com",
            "otp": "000000"
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid OTP."



@patch("app.routers.auth.send_otp_email", return_value=True)
def test_resend_otp(mock_email):

    response = client.post(
        "/resend-otp",
        json={
            "email": "newtestuser999@gmail.com"
        }
    )

    print(response.json())

    assert response.status_code in [200, 400]



# ======================================================
# LOGIN TESTS
# ======================================================

def test_login_wrong_password():

    response = client.post(
        "/login",
        json={
            "email": "newtestuser999@gmail.com",
            "password": "WrongPassword123"
        }
    )

    assert response.status_code in [401,403]



def test_login_unknown_user():

    response = client.post(
        "/login",
        json={
            "email": "unknown@gmail.com",
            "password": "Password@123"
        }
    )

    assert response.status_code == 404



# ======================================================
# FORGOT PASSWORD TESTS
# ======================================================

@patch("app.routers.auth.send_otp_email", return_value=True)
def test_forgot_password(mock_email):

    response = client.post(
        "/forgot-password",
        json={
            "email": "newtestuser999@gmail.com"
        }
    )

    print(response.json())

    assert response.status_code in [200,400]



def test_forgot_password_unknown_email():

    response = client.post(
        "/forgot-password",
        json={
            "email": "doesnotexist@gmail.com"
        }
    )

    assert response.status_code == 404



# ======================================================
# RESET PASSWORD TESTS
# ======================================================

def test_reset_password_mismatch():

    response = client.post(
        "/reset-password",
        json={
            "email": "newtestuser999@gmail.com",
            "new_password": "Password@123",
            "confirm_password": "Password@456"
        }
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Passwords do not match."