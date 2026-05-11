from app.data.database import get_conn


def find_active_by_paciente_and_triaje(paciente_email: str, triaje_id: int):
    with get_conn() as conn:
        return conn.execute(
            """SELECT id FROM citas
               WHERE paciente_email = ? AND triaje_id = ?
                 AND status IN ('pendiente', 'confirmada')""",
            (paciente_email, triaje_id),
        ).fetchone()


def insert(paciente_email: str, triaje_id, fecha_solicitada, hora_solicitada,
           now: str, room_token: str) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO citas
               (paciente_email, triaje_id, fecha_solicitada, hora_solicitada,
                status, creado_en, room_token)
               VALUES (?, ?, ?, ?, 'pendiente', ?, ?)""",
            (paciente_email, triaje_id, fecha_solicitada, hora_solicitada, now, room_token),
        )
        return cur.lastrowid


def list_by_paciente(paciente_email: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT c.*, u.nombre AS medico_nombre
               FROM citas c
               LEFT JOIN users u ON u.email = c.medico_email
               WHERE c.paciente_email = ?
               ORDER BY c.creado_en DESC""",
            (paciente_email,),
        ).fetchall()


def list_for_medico(medico_email: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT c.*,
                      u.nombre       AS paciente_nombre,
                      u.cedula       AS paciente_cedula,
                      t.triage_color AS triage_color,
                      t.symptoms     AS triaje_sintomas,
                      t.timestamp    AS triaje_fecha
               FROM citas c
               LEFT JOIN users          u ON u.email = c.paciente_email
               LEFT JOIN triage_records t ON t.id    = c.triaje_id
               WHERE (c.status = 'pendiente' AND c.medico_email IS NULL) OR c.medico_email = ?
               ORDER BY c.creado_en DESC""",
            (medico_email,),
        ).fetchall()


def list_patients_for_medico(medico_email: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT DISTINCT u.nombre, u.cedula, u.ciudad, u.telefono,
                      u.email AS paciente_email
               FROM citas c
               JOIN users u ON u.email = c.paciente_email
               WHERE c.medico_email = ?
               ORDER BY u.nombre""",
            (medico_email,),
        ).fetchall()


def medico_has_access(medico_email: str, cedula: str) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT 1 FROM citas c
               JOIN users u ON u.email = c.paciente_email
               WHERE c.medico_email = ? AND u.cedula = ?
                 AND c.status NOT IN ('rechazada', 'cancelada')
               LIMIT 1""",
            (medico_email, cedula),
        ).fetchone()
    return row is not None


def find_by_id(cita_id: int):
    with get_conn() as conn:
        return conn.execute("SELECT * FROM citas WHERE id = ?", (cita_id,)).fetchone()


def update_status(cita_id: int, new_status: str, medico_email,
                  fecha_confirmada, hora_confirmada) -> int:
    with get_conn() as conn:
        return conn.execute(
            """UPDATE citas
               SET status = ?, medico_email = ?, fecha_confirmada = ?, hora_confirmada = ?
               WHERE id = ?""",
            (new_status, medico_email, fecha_confirmada, hora_confirmada, cita_id),
        ).rowcount


def update_llamada(cita_id: int, medico_email: str, en_llamada: bool) -> int:
    if en_llamada:
        sql = "UPDATE citas SET en_llamada = 1 WHERE id = ? AND medico_email = ?"
    else:
        sql = "UPDATE citas SET en_llamada = 0, status = 'completada' WHERE id = ? AND medico_email = ?"
    with get_conn() as conn:
        return conn.execute(sql, (cita_id, medico_email)).rowcount


def list_taken_slots(fecha: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            "SELECT hora_solicitada FROM citas WHERE fecha_solicitada = ? AND status NOT IN ('cancelada', 'rechazada')",
            (fecha,),
        ).fetchall()
