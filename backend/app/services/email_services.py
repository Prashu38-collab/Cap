import os
import smtplib
from dotenv import load_dotenv

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
    raise ValueError(
        "EMAIL_ADDRESS or EMAIL_PASSWORD is missing in .env"
    )


def send_otp_email(receiver_email: str, otp: str):

    try:

        subject = "Travel Itinerary System - Email Verification"

        body = f"""
Hello,

Thank you for registering.

Your One-Time Password (OTP)

{otp}


This OTP will expire in 5 minutes.

Do not share this code with anyone.

If you did not create an account, simply ignore this email.

Travel Itinerary System
"""
        message = MIMEMultipart()

        message["From"] = EMAIL_ADDRESS
        message["To"] = receiver_email
        message["Subject"] = subject

        message.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP("smtp.gmail.com", 587)

        server.starttls()

        server.login(
            EMAIL_ADDRESS,
            EMAIL_PASSWORD
        )

        server.sendmail(
            EMAIL_ADDRESS,
            receiver_email,
            message.as_string()
        )

        server.quit()

        return True

    except Exception as e:

        print("Email Error:", e)

        return False