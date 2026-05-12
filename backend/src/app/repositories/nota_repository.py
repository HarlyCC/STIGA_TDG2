from app.data.database import get_conn


def list_by_paciente(paciente_email: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT * FROM notas_clinicas
               WHERE paciente_email = ?
               ORDER BY created_at DESC""",
            (paciente_email,),
        ).fetchall()


def insert(cedula: str, paciente_email: str, medico_email: str, medico_nombre: str,
           titulo: str, contenido: str, now: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO notas_clinicas
               (cedula_paciente, paciente_email, medico_email, medico_nombre, titulo, contenido, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (cedula, paciente_email, medico_email, medico_nombre, titulo, contenido, now),
        )
        return cur.lastrowid
