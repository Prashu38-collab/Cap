from sqlalchemy.orm import Session
from sqlalchemy import text

from app.crud.admin_activity_crud import log_admin_activity

# Create Contact Message

def create_contact_message(
    db: Session,
    name: str,
    email: str,
    phone: str,
    subject: str,
    message: str
):

    db.execute(
        text("""
            INSERT INTO contact_messages
            (
                name,
                email,
                phone,
                subject,
                message,
                status
            )
            VALUES
            (
                :name,
                :email,
                :phone,
                :subject,
                :message,
                'Unread'
            )
        """),
        {
            "name": name,
            "email": email,
            "phone": phone,
            "subject": subject,
            "message": message
        }
    )

    db.commit()

# Get All Messages

def get_all_messages(db: Session):

    rows = db.execute(
        text("""
            SELECT
                message_id,
                name,
                email,
                phone,
                subject,
                message,
                status,
                created_at
            FROM contact_messages
            ORDER BY created_at DESC
        """)
    ).fetchall()

    return rows

# Update Status

# def update_message_status(
#     db: Session,
#     message_id: int,
#     status: str
# ):

#     result = db.execute(
#         text("""
#             UPDATE contact_messages
#             SET status=:status
#             WHERE message_id=:message_id
#         """),
#         {
#             "status": status,
#             "message_id": message_id
#         }
#     )

#     db.commit()

#     return result.rowcount > 0

def update_message_status(
    db: Session,
    message_id: int,
    status: str
):

    # Get sender name before updating
    message = db.execute(
        text("""
            SELECT
                name,
                subject
            FROM contact_messages
            WHERE message_id = :message_id
        """),
        {
            "message_id": message_id
        }
    ).mappings().first()

    if not message:
        return False

    result = db.execute(
        text("""
            UPDATE contact_messages
            SET status = :status
            WHERE message_id = :message_id
        """),
        {
            "status": status,
            "message_id": message_id
        }
    )

    db.commit()

    log_admin_activity(
        db,
        "Message Status Updated",
        f"Marked message from '{message['name']}' as {status}"
    )

    return result.rowcount > 0

# Delete Message

# def delete_message(
#     db: Session,
#     message_id: int
# ):

#     result = db.execute(
#         text("""
#             DELETE FROM contact_messages
#             WHERE message_id=:message_id
#         """),
#         {
#             "message_id": message_id
#         }
#     )

#     db.commit()

#     return result.rowcount > 0

def delete_message(
    db: Session,
    message_id: int
):

    # Get message details before deleting
    message = db.execute(
        text("""
            SELECT
                name,
                subject
            FROM contact_messages
            WHERE message_id = :message_id
        """),
        {
            "message_id": message_id
        }
    ).mappings().first()

    if not message:
        return False

    result = db.execute(
        text("""
            DELETE FROM contact_messages
            WHERE message_id = :message_id
        """),
        {
            "message_id": message_id
        }
    )

    db.commit()

    log_admin_activity(
        db,
        "Message Deleted",
        f"Deleted message from '{message['name']}' ({message['subject']})"
    )

    return result.rowcount > 0