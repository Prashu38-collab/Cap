from sqlalchemy import text
from sqlalchemy.orm import Session

# LOG ADMIN ACTIVITY

def log_admin_activity(
    db: Session,
    action_type: str,
    description: str
):

    db.execute(
        text("""
            INSERT INTO admin_activity_logs
            (
                action_type,
                description
            )

            VALUES
            (
                :action_type,
                :description
            )
        """),
        {
            "action_type": action_type,
            "description": description
        }
    )

    db.commit()


# GET RECENT ACTIVITIES

def get_recent_admin_activities(db: Session):

    result = db.execute(
        text("""
            SELECT
                activity_id,
                action_type,
                description,
                created_at

            FROM admin_activity_logs

            ORDER BY created_at DESC

            LIMIT 10
        """)
    )

    return result.mappings().all()
