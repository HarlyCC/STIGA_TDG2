from app.data.database import get_conn


def list_by_cedula(cedula: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT * FROM notas_clinicas
               WHERE cedula_paciente = ?
               ORDER BY created_at DESC""",
            (cedula,),
        ).fetchall()


def insert(cedula: str, medico_email: str, medico_nombre: str,
           titulo: str, contenido: str, now: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO notas_clinicas
               (cedula_paciente, medico_email, medico_nombre, titulo, contenido, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (cedula, medico_email, medico_nombre, titulo, contenido, now),
        )
        return cur.lastrowid
