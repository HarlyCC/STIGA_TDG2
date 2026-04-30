import logging
import random
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.data.database import get_conn
from app.core.security import hash_password, verify_password, create_jwt
from app.services.email_service import (
    send_verification_email,
    send_reset_email,
    send_doctor_access_request_email,
)

logger = logging.getLogger("stiga.auth_service")

CODE_EXPIRE_MINUTES = 15

# ── Internal utilities ───────────────────────────────────────────────────────

def _generate_code() -> str:
    return str(random.randint(100000, 999999))


def _code_expires_at() -> str:
    return (
        datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRE_MINUTES)
    ).isoformat()


# ── Business logic ───────────────────────────────────────────────────────────

def register_user(data: dict) -> dict:
    """
    Creates or updates a pending patient account and sends the verification code.
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

    logger.info(f"Registration started | {data['email']}")
    return {"message": f"Código de verificación enviado a {data['email']}."}


def verify_user(email: str, code: str) -> dict:
    """Verifies the code and activates the account."""
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

    logger.info(f"Account verified | {email}")
    return {"message": "Cuenta verificada correctamente. Ya puede iniciar sesión."}


def login_user(email: str, password: str) -> dict:
    """Authenticates the user and returns the JWT."""
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
    logger.info(f"Login successful | {email} | role: {user['role']}")

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
    """Generates and resends a new verification code."""
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

    logger.info(f"Code resent | {email}")
    return {"message": f"Nuevo código enviado a {email}."}


def forgot_password(email: str) -> dict:
    """
    Generates and sends a password recovery code.
    Always responds with the same message to avoid revealing whether the email exists.
    """
    code       = _generate_code()
    expires_at = _code_expires_at()

    with get_conn() as conn:
        user = conn.execute(
            "SELECT nombre, is_verified FROM users WHERE email = ?", (email,)
        ).fetchone()

        if not user or not user["is_verified"]:
            return {"message": "Si el correo está registrado, recibirás un código de recuperación."}

        conn.execute(
            "UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE email = ?",
            (code, expires_at, email),
        )

    try:
        send_reset_email(email, user["nombre"], code, CODE_EXPIRE_MINUTES)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    logger.info(f"Recovery code sent | {email}")
    return {"message": "Si el correo está registrado, recibirás un código de recuperación."}


def reset_password(email: str, code: str, new_password: str) -> dict:
    """Validates the code and updates the password."""
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )

    with get_conn() as conn:
        user = conn.execute(
            "SELECT reset_code, reset_code_expires FROM users WHERE email = ?", (email,)
        ).fetchone()

        if not user or user["reset_code"] != code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código incorrecto o expirado.",
            )

        expires = datetime.fromisoformat(user["reset_code_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código ha expirado. Solicite uno nuevo.",
            )

        hashed = hash_password(new_password)
        conn.execute(
            """UPDATE users
               SET hashed_password = ?, reset_code = NULL, reset_code_expires = NULL
               WHERE email = ?""",
            (hashed, email),
        )

    logger.info(f"Password reset | {email}")
    return {"message": "Contraseña actualizada correctamente. Ya puede iniciar sesión."}


def request_doctor_access(datos: dict) -> dict:
    """Saves the doctor access request and notifies the administrator by email."""
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO solicitudes_medico
               (tipo_documento, numero_documento, nombre, centro_salud, telefono, email, especialidad, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                datos["tipo_documento"], datos["numero_documento"], datos["nombre"],
                datos["centro_salud"], datos["telefono"], datos["email"],
                datos.get("especialidad"), now,
            ),
        )
    try:
        send_doctor_access_request_email(datos)
    except Exception:
        logger.warning(f"Request saved but email notification failed | {datos['email']}")
    logger.info(f"Doctor access request received | {datos['email']}")
    return {"message": "Solicitud enviada correctamente. El equipo de STIGA revisará tu información y se comunicará contigo pronto."}


def change_password(email: str, current_password: str, new_password: str) -> dict:
    """Validates the current password and sets a new one for the authenticated user."""
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La nueva contraseña debe tener al menos 6 caracteres.",
        )

    with get_conn() as conn:
        user = conn.execute(
            "SELECT hashed_password FROM users WHERE email = ?", (email,)
        ).fetchone()

    if not user or not verify_password(current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta.",
        )

    if verify_password(new_password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a la actual.",
        )

    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?",
            (hash_password(new_password), email),
        )

    logger.info(f"Password changed | {email}")
    return {"message": "Contraseña actualizada correctamente."}


def get_profile(email: str) -> dict:
    """Returns the authenticated user's profile data."""
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


_ALLOWED_PROFILE_FIELDS = {
    "nombre", "telefono", "direccion",
    "eps", "ciudad", "fecha_nacimiento", "gender",
}

def update_profile(email: str, updates: dict) -> dict:
    """Updates only the fields sent in the user's profile."""
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se enviaron campos para actualizar.",
        )

    invalid = set(updates.keys()) - _ALLOWED_PROFILE_FIELDS
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Campo(s) no permitido(s): {', '.join(invalid)}",
        )

    fields_sql = ", ".join(f"{col} = ?" for col in updates)
    values     = list(updates.values()) + [email]

    with get_conn() as conn:
        conn.execute(f"UPDATE users SET {fields_sql} WHERE email = ?", values)

    logger.info(f"Profile updated | {email} | fields: {list(updates.keys())}")
    return {"message": "Datos actualizados correctamente."}
