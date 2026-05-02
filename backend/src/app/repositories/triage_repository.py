from app.data.database import get_conn


def list_all(color, limit: int, offset: int) -> tuple:
    conditions, params = [], []
    if color:
        conditions.append("triage_color = ?")
        params.append(color)
    where   = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    count_q = f"SELECT COUNT(*) FROM triage_records{where}"
    query   = f"SELECT * FROM triage_records{where} ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    with get_conn() as conn:
        total = conn.execute(count_q, params).fetchone()[0]
        rows  = conn.execute(query, params + [limit, offset]).fetchall()
    return total, rows


def list_by_medico(medico_email: str, color, limit: int, offset: int) -> tuple:
    params = [medico_email]
    color_clause = ""
    if color:
        color_clause = " WHERE t.triage_color = ?"
        params.append(color)
    inner = f"""
        SELECT t.*, MAX(c.id) AS cita_id, c.room_token
        FROM triage_records t
        INNER JOIN citas c
            ON c.paciente_email = t.user_email
           AND c.medico_email = ?
           AND c.status = 'confirmada'
        {color_clause}
        GROUP BY t.id
    """
    count_q = f"SELECT COUNT(*) FROM ({inner}) sub"
    query   = inner + " ORDER BY t.timestamp DESC LIMIT ? OFFSET ?"
    with get_conn() as conn:
        total = conn.execute(count_q, params).fetchone()[0]
        rows  = conn.execute(query, params + [limit, offset]).fetchall()
    return total, rows


def list_by_user(user_email: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT t.*,
                      (SELECT u.nombre
                       FROM citas c
                       JOIN users u ON u.email = c.medico_email
                       WHERE c.triaje_id = t.id AND c.status = 'confirmada'
                       LIMIT 1) AS medico_nombre
               FROM triage_records t
               WHERE t.user_email = ?
               ORDER BY t.timestamp DESC""",
            (user_email,),
        ).fetchall()


def list_by_cedula(cedula: str) -> list:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM triage_records WHERE cedula = ? ORDER BY timestamp DESC",
            (cedula,),
        ).fetchall()


def insert_triage(session_id: str, timestamp: str, user_email: str,
                  patient_data: dict, triage_result: dict) -> int:
    pd = patient_data
    tr = triage_result
    with get_conn() as conn:
        cur = conn.execute("""
            INSERT INTO triage_records (
                session_id, timestamp, user_email,
                nombre, cedula, telefono, direccion, eps,
                age, gender, heart_rate, systolic_bp,
                o2_sat, body_temp, glucose, cholesterol,
                symptoms, symptom_severity,
                respiratory_rate, pain_scale, symptom_duration,
                ciudad, tiene_transporte, necesita_ambulancia,
                triage_level, triage_color, confianza, escalado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id, timestamp, user_email,
            pd.get("nombre"), pd.get("cedula"), pd.get("telefono"),
            pd.get("direccion"), pd.get("eps"),
            pd.get("age"), pd.get("gender"),
            pd.get("heart_rate"), pd.get("systolic_bp"),
            pd.get("o2_sat"), pd.get("body_temp"),
            pd.get("glucose"), pd.get("cholesterol"),
            pd.get("symptoms"), pd.get("symptom_severity"),
            pd.get("respiratory_rate"), pd.get("pain_scale"),
            pd.get("symptom_duration"),
            pd.get("ciudad"),
            int(pd.get("tiene_transporte") or 0),
            int(pd.get("necesita_ambulancia") or 0),
            tr.get("nivel"), tr.get("color"),
            tr.get("confianza"), int(tr.get("escalado") or 0),
        ))
        return cur.lastrowid


def insert_alerta(triaje_id: int, paciente_email: str, paciente_nombre,
                  paciente_telefono, ciudad, triage_color: str, created_at: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO alertas_criticas
               (triaje_id, paciente_email, paciente_nombre, paciente_telefono,
                ciudad, triage_color, created_at, leida)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)""",
            (triaje_id, paciente_email, paciente_nombre, paciente_telefono,
             ciudad, triage_color, created_at),
        )


def list_alertas() -> list:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM alertas_criticas ORDER BY leida ASC, created_at DESC"
        ).fetchall()


def atender_alerta(alerta_id: int) -> int:
    with get_conn() as conn:
        return conn.execute(
            "UPDATE alertas_criticas SET leida = 1, estado = 'atendida' WHERE id = ?",
            (alerta_id,),
        ).rowcount


def delete_alerta(alerta_id: int) -> int:
    with get_conn() as conn:
        return conn.execute(
            "DELETE FROM alertas_criticas WHERE id = ?", (alerta_id,)
        ).rowcount


def count_total() -> int:
    with get_conn() as conn:
        return conn.execute("SELECT COUNT(*) as total FROM triage_records").fetchone()["total"]


def count_by_color() -> list:
    with get_conn() as conn:
        return conn.execute(
            "SELECT triage_color, COUNT(*) as total FROM triage_records GROUP BY triage_color"
        ).fetchall()


def count_per_day(dates: list) -> list:
    results = []
    with get_conn() as conn:
        for fecha in dates:
            count = conn.execute(
                "SELECT COUNT(*) as total FROM triage_records WHERE DATE(timestamp) = ?",
                (fecha,)
            ).fetchone()["total"]
            results.append({"fecha": fecha, "total": count})
    return results


def count_in_date_range(start: str, end: str) -> int:
    with get_conn() as conn:
        return conn.execute(
            """SELECT COUNT(*) as total FROM triage_records
               WHERE DATE(timestamp) >= ? AND DATE(timestamp) < ?""",
            (start, end)
        ).fetchone()["total"]


def get_master_triage_rows() -> list:
    """All rows from master_triage — used by the ML training pipeline."""
    with get_conn() as conn:
        return conn.execute("SELECT * FROM master_triage").fetchall()


def count_by_ciudad_and_color() -> list:
    with get_conn() as conn:
        return conn.execute(
            """SELECT ciudad, triage_color, COUNT(*) as total
               FROM triage_records
               WHERE ciudad IS NOT NULL AND ciudad != ''
               GROUP BY ciudad, triage_color"""
        ).fetchall()
