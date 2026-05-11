from app.data.database import get_conn


def find_by_email(email: str):
    with get_conn() as conn:
        return conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()


def find_pending(email: str):
    """Returns id + is_verified. Used to detect duplicate registrations."""
    with get_conn() as conn:
        return conn.execute(
            "SELECT id, is_verified FROM users WHERE email = ?", (email,)
        ).fetchone()


def find_for_forgot(email: str):
    """Returns nombre + is_verified. Used by forgot_password."""
    with get_conn() as conn:
        return conn.execute(
            "SELECT nombre, is_verified FROM users WHERE email = ?", (email,)
        ).fetchone()


def find_for_reset(email: str):
    """Returns reset_code + reset_code_expires. Used by reset_password."""
    with get_conn() as conn:
        return conn.execute(
            "SELECT reset_code, reset_code_expires FROM users WHERE email = ?", (email,)
        ).fetchone()


def get_profile(email: str):
    with get_conn() as conn:
        return conn.execute(
            """SELECT nombre, email, cedula, telefono, direccion,
                      eps, ciudad, fecha_nacimiento, gender, role, created_at
               FROM users WHERE email = ?""",
            (email,),
        ).fetchone()


def get_full_profile(email: str):
    """All public fields — for admin view."""
    with get_conn() as conn:
        return conn.execute(
            """SELECT id, nombre, email, role, is_verified,
                      cedula, telefono, direccion, eps, ciudad,
                      fecha_nacimiento, gender, created_at
               FROM users WHERE email = ?""",
            (email,),
        ).fetchone()


def get_patient_data(email: str):
    """Fields needed to pre-fill a triage session."""
    with get_conn() as conn:
        return conn.execute(
            """SELECT nombre, cedula, telefono, direccion, eps,
                      ciudad, fecha_nacimiento, gender
               FROM users WHERE email = ?""",
            (email,),
        ).fetchone()


def find_by_cedula(cedula: str):
    with get_conn() as conn:
        return conn.execute(
            """SELECT nombre, email, cedula, telefono, direccion,
                      eps, ciudad, fecha_nacimiento, gender
               FROM users WHERE cedula = ?""",
            (cedula,),
        ).fetchone()


def exists(email: str) -> bool:
    with get_conn() as conn:
        return conn.execute(
            "SELECT id FROM users WHERE email = ?", (email,)
        ).fetchone() is not None


def is_medico(email: str) -> bool:
    with get_conn() as conn:
        return conn.execute(
            "SELECT id FROM users WHERE email = ? AND role = 'medico'", (email,)
        ).fetchone() is not None


def create_patient(data: dict, hashed_pw: str, hashed_code: str, expires_at: str, now: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO users
               (nombre, email, hashed_password, role, is_verified,
                verification_code, verification_expires,
                cedula, telefono, direccion, eps, ciudad,
                fecha_nacimiento, gender, created_at)
               VALUES (?, ?, ?, 'paciente', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data["nombre"], data["email"], hashed_pw,
                hashed_code, expires_at,
                data["cedula"], data["telefono"], data["direccion"],
                data["eps"], data["ciudad"], data["fecha_nacimiento"], data["gender"],
                now,
            ),
        )


def update_pending_patient(email: str, data: dict, hashed_pw: str, hashed_code: str, expires_at: str):
    with get_conn() as conn:
        conn.execute(
            """UPDATE users
               SET nombre = ?, hashed_password = ?,
                   cedula = ?, telefono = ?, direccion = ?,
                   eps = ?, ciudad = ?, fecha_nacimiento = ?, gender = ?,
                   verification_code = ?, verification_expires = ?
               WHERE email = ?""",
            (
                data["nombre"], hashed_pw,
                data["cedula"], data["telefono"], data["direccion"],
                data["eps"], data["ciudad"], data["fecha_nacimiento"], data["gender"],
                hashed_code, expires_at, email,
            ),
        )


def activate(email: str):
    with get_conn() as conn:
        conn.execute(
            """UPDATE users
               SET is_verified = 1, verification_code = NULL, verification_expires = NULL
               WHERE email = ?""",
            (email,),
        )


def set_verification_code(email: str, hashed_code: str, expires_at: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET verification_code = ?, verification_expires = ? WHERE email = ?",
            (hashed_code, expires_at, email),
        )


def set_reset_code(email: str, hashed_code: str, expires_at: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE email = ?",
            (hashed_code, expires_at, email),
        )


def update_password_and_clear_reset(email: str, hashed: str):
    with get_conn() as conn:
        conn.execute(
            """UPDATE users
               SET hashed_password = ?, reset_code = NULL, reset_code_expires = NULL
               WHERE email = ?""",
            (hashed, email),
        )


def update_hashed_password(email: str, hashed: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?",
            (hashed, email),
        )


def update_fields(email: str, fields: dict) -> int:
    fields_sql = ", ".join(f"{col} = ?" for col in fields)
    values = list(fields.values()) + [email]
    with get_conn() as conn:
        return conn.execute(
            f"UPDATE users SET {fields_sql} WHERE email = ?", values
        ).rowcount


def create_staff(nombre: str, email: str, hashed_pw: str, role: str,
                 cedula, telefono, direccion, eps, ciudad, fecha_nacimiento, gender,
                 now: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO users
               (nombre, email, hashed_password, role, is_verified,
                cedula, telefono, direccion, eps, ciudad,
                fecha_nacimiento, gender, created_at)
               VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (nombre, email, hashed_pw, role,
             cedula, telefono, direccion, eps, ciudad, fecha_nacimiento, gender,
             now),
        )


def create_medico_from_solicitud(nombre: str, email: str, hashed_pw: str,
                                  cedula: str, telefono: str, now: str):
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO users
               (nombre, email, hashed_password, role, is_verified,
                cedula, telefono, created_at)
               VALUES (?, ?, ?, 'medico', 1, ?, ?, ?)""",
            (nombre, email, hashed_pw, cedula, telefono, now),
        )


def list_users(role, limit: int, offset: int) -> tuple:
    conditions = ["(role != 'paciente' OR is_verified = 1)"]
    params = []
    if role:
        conditions.append("role = ?")
        params.append(role)
    where = f" WHERE {' AND '.join(conditions)}"
    query = f"""SELECT id, nombre, email, role, is_verified,
                       cedula, telefono, ciudad, created_at
                FROM users{where}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?"""
    params_count = params[:]
    params += [limit, offset]
    with get_conn() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM users{where}", params_count).fetchone()[0]
        rows  = conn.execute(query, params).fetchall()
    return total, rows


def update_role(email: str, role: str) -> int:
    with get_conn() as conn:
        return conn.execute(
            "UPDATE users SET role = ? WHERE email = ?", (role, email)
        ).rowcount


def delete(email: str) -> int:
    with get_conn() as conn:
        return conn.execute(
            "DELETE FROM users WHERE email = ?", (email,)
        ).rowcount


def count_by_role() -> list:
    with get_conn() as conn:
        return conn.execute(
            "SELECT role, COUNT(*) as total FROM users GROUP BY role"
        ).fetchall()
