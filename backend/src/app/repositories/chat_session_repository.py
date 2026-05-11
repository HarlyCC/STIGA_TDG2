import json
from datetime import datetime, timezone

from app.data.database import get_conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert(session_id: str, user_email: str, system_prompt: str,
           history: list, patient_data: dict, is_complete: bool):
    now = _now()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO chat_sessions
               (session_id, user_email, system_prompt, history_json,
                patient_data_json, is_complete, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(session_id) DO UPDATE SET
                   history_json      = excluded.history_json,
                   patient_data_json = excluded.patient_data_json,
                   is_complete       = excluded.is_complete,
                   updated_at        = excluded.updated_at""",
            (session_id, user_email, system_prompt,
             json.dumps(history, ensure_ascii=False),
             json.dumps(patient_data, ensure_ascii=False),
             int(is_complete), now, now),
        )


def find_active_by_user(user_email: str):
    with get_conn() as conn:
        return conn.execute(
            """SELECT * FROM chat_sessions
               WHERE user_email = ? AND is_complete = 0
               ORDER BY updated_at DESC LIMIT 1""",
            (user_email,),
        ).fetchone()


def delete(session_id: str):
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM chat_sessions WHERE session_id = ?", (session_id,)
        )
