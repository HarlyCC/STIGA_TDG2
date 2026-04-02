import logging
import random
import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from config.paths import DB_PATH
from validation.dependencies import hash_password, verify_password, create_jwt
from validation.email_service import send_verification_email

logger = logging.getLogger("stiga.auth_service")

CODE_EXPIRE_MINUTES = 15

# ── Conexión ─────────────────────────────────────────────────────────────────

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── Utilidades internas ──────────────────────────────────────────────────────

def _generate_code() -> str:
    return str(random.randint(100000, 999999))


def _code_expires_at() -> str:
    return (
        datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRE_MINUTES)
    ).isoformat()


# ── Lógica de negocio ────────────────────────────────────────────────────────

def register_user(data: dict) -> dict:
    """
    Crea o actualiza una cuenta de paciente pendiente de verificación
    y envía el código de verificación al correo.
    """
    if len(data["password"]) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )

    code       = _generate_code()
    expires_at = _code_expires_at()
    hashed_pw  = hash_password(data["password"])
    now        = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id, is_verified FROM users WHERE email = ?", (data["email"],)
        ).fetchone()

        if existing:
            if existing["is_verified"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe una cuenta verificada con este correo.",
                )
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
                    code, expires_at, data["email"],
                ),
            )
        else:
            conn.execute(
                """INSERT INTO users
                   (nombre, email, hashed_password, role, is_verified,
                    verification_code, verification_expires,
                    cedula, telefono, direccion, eps, ciudad,
                    fecha_nacimiento, gender, created_at)
                   VALUES (?, ?, ?, 'paciente', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    data["nombre"], data["email"], hashed_pw,
                    code, expires_at,
                    data["cedula"], data["telefono"], data["direccion"],
                    data["eps"], data["ciudad"], data["fecha_nacimiento"], data["gender"],
                    now,
                ),
            )

    try:
        send_verification_email(data["email"], data["nombre"], code, CODE_EXPIRE_MINUTES)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    logger.info(f"Registro iniciado | {data['email']}")
    return {"message": f"Código de verificación enviado a {data['email']}."}


def verify_user(email: str, code: str) -> dict:
    """Verifica el código e activa la cuenta."""
    with get_conn() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Correo no encontrado.")
        if user["is_verified"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="La cuenta ya está verificada.")
        if user["verification_code"] != code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Código incorrecto.")

        expires = datetime.fromisoformat(user["verification_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código ha expirado. Solicite uno nuevo.",
            )

        conn.execute(
            """UPDATE users
               SET is_verified = 1, verification_code = NULL, verification_expires = NULL
               WHERE email = ?""",
            (email,),
        )

    logger.info(f"Cuenta verificada | {email}")
    return {"message": "Cuenta verificada correctamente. Ya puede iniciar sesión."}


def login_user(email: str, password: str) -> dict:
    """Autentica al usuario y retorna el JWT."""
    with get_conn() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()

    if not user or not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )
    if not user["is_verified"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta no ha sido verificada. Revise su correo.",
        )

    token = create_jwt(user["email"], user["role"], user["nombre"])
    logger.info(f"Login exitoso | {email} | rol: {user['role']}")

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "email":  user["email"],
            "nombre": user["nombre"],
            "role":   user["role"],
        },
    }


def resend_verification_code(email: str) -> dict:
    """Genera y reenvía un nuevo código de verificación."""
    code       = _generate_code()
    expires_at = _code_expires_at()

    with get_conn() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?", (email,)
        ).fetchone()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Correo no encontrado.")
        if user["is_verified"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="La cuenta ya está verificada.")

        conn.execute(
            "UPDATE users SET verification_code = ?, verification_expires = ? WHERE email = ?",
            (code, expires_at, email),
        )

    try:
        send_verification_email(email, user["nombre"], code, CODE_EXPIRE_MINUTES)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    logger.info(f"Código reenviado | {email}")
    return {"message": f"Nuevo código enviado a {email}."}


def get_profile(email: str) -> dict:
    """Retorna los datos del perfil del usuario autenticado."""
    with get_conn() as conn:
        user = conn.execute(
            """SELECT nombre, email, cedula, telefono, direccion,
                      eps, ciudad, fecha_nacimiento, gender, role, created_at
               FROM users WHERE email = ?""",
            (email,),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")
    return dict(user)


def update_profile(email: str, updates: dict) -> dict:
    """Actualiza solo los campos enviados en el perfil del usuario."""
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se enviaron campos para actualizar.",
        )

    fields_sql = ", ".join(f"{col} = ?" for col in updates)
    values     = list(updates.values()) + [email]

    with get_conn() as conn:
        conn.execute(f"UPDATE users SET {fields_sql} WHERE email = ?", values)

    logger.info(f"Perfil actualizado | {email} | campos: {list(updates.keys())}")
    return {"message": "Datos actualizados correctamente."}
