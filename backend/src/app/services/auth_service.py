import logging
import random
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.security import hash_password, verify_password, create_jwt
from app.repositories import user_repository, solicitud_repository
from app.services.email_service import (
    send_verification_email,
    send_reset_email,
    send_doctor_access_request_email,
)

logger = logging.getLogger("stiga.auth_service")

CODE_EXPIRE_MINUTES = 15


def _generate_code() -> str:
    return str(random.randint(100000, 999999))


def _code_expires_at() -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=CODE_EXPIRE_MINUTES)).isoformat()


def register_user(data: dict) -> dict:
    cedula = str(data["cedula"]).strip()
    if len(cedula) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La cédula debe tener al menos 6 dígitos.",
        )
    initial_password = cedula[-6:]

    code        = _generate_code()
    expires_at  = _code_expires_at()
    hashed_pw   = hash_password(initial_password)
    hashed_code = hash_password(code)
    now         = datetime.now(timezone.utc).isoformat()

    existing = user_repository.find_pending(data["email"])
    if existing:
        if existing["is_verified"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una cuenta verificada con este correo.",
            )
        user_repository.update_pending_patient(data["email"], data, hashed_pw, hashed_code, expires_at)
    else:
        user_repository.create_patient(data, hashed_pw, hashed_code, expires_at, now)

    try:
        send_verification_email(data["email"], data["nombre"], code, CODE_EXPIRE_MINUTES)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    logger.info(f"Registration started | {data['email']}")
    return {"message": f"Código de verificación enviado a {data['email']}."}


def verify_user(email: str, code: str) -> dict:
    user = user_repository.find_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Correo no encontrado.")
    if user["is_verified"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="La cuenta ya está verificada.")
    if not verify_password(code, user["verification_code"] or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Código incorrecto.")

    expires = datetime.fromisoformat(user["verification_expires"])
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ha expirado. Solicite uno nuevo.",
        )

    user_repository.activate(email)
    logger.info(f"Account verified | {email}")
    return {"message": "Cuenta verificada correctamente. Ya puede iniciar sesión."}


def login_user(email: str, password: str) -> dict:
    user = user_repository.find_by_email(email)
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
    code       = _generate_code()
    expires_at = _code_expires_at()

    user = user_repository.find_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Correo no encontrado.")
    if user["is_verified"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="La cuenta ya está verificada.")

    user_repository.set_verification_code(email, hash_password(code), expires_at)

    try:
        send_verification_email(email, user["nombre"], code, CODE_EXPIRE_MINUTES)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    logger.info(f"Code resent | {email}")
    return {"message": f"Nuevo código enviado a {email}."}


def forgot_password(email: str) -> dict:
    code       = _generate_code()
    expires_at = _code_expires_at()

    user = user_repository.find_for_forgot(email)
    if not user or not user["is_verified"]:
        return {"message": "Si el correo está registrado, recibirás un código de recuperación."}

    user_repository.set_reset_code(email, hash_password(code), expires_at)

    try:
        send_reset_email(email, user["nombre"], code, CODE_EXPIRE_MINUTES)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    logger.info(f"Recovery code sent | {email}")
    return {"message": "Si el correo está registrado, recibirás un código de recuperación."}


def reset_password(email: str, code: str, new_password: str) -> dict:
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )

    user = user_repository.find_for_reset(email)
    if not user or not user["reset_code"] or not verify_password(code, user["reset_code"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Código incorrecto o expirado.")

    expires = datetime.fromisoformat(user["reset_code_expires"])
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ha expirado. Solicite uno nuevo.",
        )

    user_repository.update_password_and_clear_reset(email, hash_password(new_password))
    logger.info(f"Password reset | {email}")
    return {"message": "Contraseña actualizada correctamente. Ya puede iniciar sesión."}


def request_doctor_access(datos: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    solicitud_repository.insert(datos, now)
    try:
        send_doctor_access_request_email(datos)
    except Exception:
        logger.warning(f"Request saved but email notification failed | {datos['email']}")
    logger.info(f"Doctor access request received | {datos['email']}")
    return {
        "message": (
            "Solicitud enviada correctamente. "
            "El equipo de STIGA revisará tu información y se comunicará contigo pronto."
        )
    }


def change_password(email: str, current_password: str, new_password: str) -> dict:
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La nueva contraseña debe tener al menos 6 caracteres.",
        )

    user = user_repository.find_by_email(email)
    if not user or not verify_password(current_password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="La contraseña actual es incorrecta.")
    if verify_password(new_password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="La nueva contraseña debe ser diferente a la actual.")

    user_repository.update_hashed_password(email, hash_password(new_password))
    logger.info(f"Password changed | {email}")
    return {"message": "Contraseña actualizada correctamente."}


def get_profile(email: str) -> dict:
    user = user_repository.get_profile(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")
    return dict(user)


_ALLOWED_PROFILE_FIELDS = {
    "nombre", "telefono", "direccion",
    "eps", "ciudad", "fecha_nacimiento", "gender",
}


def update_profile(email: str, updates: dict) -> dict:
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
    user_repository.update_fields(email, updates)
    logger.info(f"Profile updated | {email} | fields: {list(updates.keys())}")
    return {"message": "Datos actualizados correctamente."}
