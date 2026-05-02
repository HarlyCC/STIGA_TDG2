from app.data.database import get_conn


def list_by_medico(medico_email: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT dia_semana, hora_inicio, hora_fin
               FROM medico_horarios
               WHERE medico_email = ?
               ORDER BY dia_semana""",
            (medico_email,),
        ).fetchall()


def list_by_dia(dia_semana: int) -> list:
    with get_conn() as conn:
        return conn.execute(
            "SELECT hora_inicio, hora_fin FROM medico_horarios WHERE dia_semana = ?",
            (dia_semana,),
        ).fetchall()


def upsert(medico_email: str, dia_semana: int, hora_inicio: str, hora_fin: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO medico_horarios (medico_email, dia_semana, hora_inicio, hora_fin)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(medico_email, dia_semana)
               DO UPDATE SET hora_inicio = excluded.hora_inicio,
                             hora_fin    = excluded.hora_fin""",
            (medico_email, dia_semana, hora_inicio, hora_fin),
        )


def delete(medico_email: str, dia_semana: int):
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM medico_horarios WHERE medico_email = ? AND dia_semana = ?",
            (medico_email, dia_semana),
        )
