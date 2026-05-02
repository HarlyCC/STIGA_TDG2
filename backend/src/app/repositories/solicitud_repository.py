from app.data.database import get_conn


def insert(datos: dict, now: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO solicitudes_medico
               (tipo_documento, numero_documento, nombre, centro_salud,
                telefono, email, especialidad, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                datos["tipo_documento"], datos["numero_documento"], datos["nombre"],
                datos["centro_salud"], datos["telefono"], datos["email"],
                datos.get("especialidad"), now,
            ),
        )


def list_with_filter(estado) -> list:
    conditions, params = [], []
    if estado:
        conditions.append("estado = ?")
        params.append(estado)
    where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    with get_conn() as conn:
        return conn.execute(
            f"SELECT * FROM solicitudes_medico{where} ORDER BY created_at DESC",
            params,
        ).fetchall()


def find_by_id(solicitud_id: int):
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM solicitudes_medico WHERE id = ?", (solicitud_id,)
        ).fetchone()


def update_estado(solicitud_id: int, estado: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE solicitudes_medico SET estado = ? WHERE id = ?",
            (estado, solicitud_id),
        )
