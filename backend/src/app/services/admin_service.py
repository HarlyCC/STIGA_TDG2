import logging
import secrets
import string
from datetime import date as date_type, datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.security import hash_password
from app.repositories import (
    user_repository,
    triage_repository,
    solicitud_repository,
    horario_repository,
)
from app.services.email_service import send_doctor_credentials_email

logger = logging.getLogger("stiga.admin_service")


# Gestión de usuarios

def create_user(data: dict, admin_email: str) -> dict:
    if len(data["password"]) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )
    if user_repository.exists(data["email"]):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este correo.",
        )
    hashed_pw = hash_password(data["password"])
    now = datetime.now(timezone.utc).isoformat()
    user_repository.create_staff(
        data["nombre"], data["email"], hashed_pw, data["role"],
        data.get("cedula"), data.get("telefono"), data.get("direccion"),
        data.get("eps"), data.get("ciudad"), data.get("fecha_nacimiento"),
        data.get("gender"), now,
    )
    logger.info(f"Usuario creado por admin | {data['email']} | rol: {data['role']} | por: {admin_email}")
    return {"message": f"Cuenta de {data['role']} creada correctamente para {data['email']}."}


def list_users(role, limit: int, offset: int) -> dict:
    total, rows = user_repository.list_users(role, min(limit, 500), max(offset, 0))
    return {"total": total, "items": [dict(r) for r in rows]}


def get_user(email: str) -> dict:
    user = user_repository.get_full_profile(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")
    return dict(user)


def change_role(email: str, role: str, admin_email: str) -> dict:
    affected = user_repository.update_role(email, role)
    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")
    logger.info(f"Rol actualizado | {email} → {role} | por: {admin_email}")
    return {"message": f"Rol actualizado a '{role}' correctamente."}


def delete_user(email: str, admin_email: str) -> dict:
    affected = user_repository.delete(email)
    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")
    logger.info(f"Usuario eliminado | {email} | por: {admin_email}")
    return {"message": f"Usuario {email} eliminado correctamente."}


def approve_user(email: str, admin_email: str) -> dict:
    user = user_repository.find_by_email(email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")
    if user["is_verified"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="El usuario ya está verificado.")
    user_repository.activate(email)
    logger.info(f"Usuario aprobado manualmente | {email} | por: {admin_email}")
    return {"message": f"Usuario {email} aprobado correctamente."}


# Estadísticas

def estadisticas() -> dict:
    hoy = date_type.today()
    dias_actuales      = [(hoy - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    fecha_ini_anterior = (hoy - timedelta(days=14)).isoformat()
    fecha_fin_anterior = (hoy - timedelta(days=7)).isoformat()

    usuarios_por_rol  = user_repository.count_by_role()
    total_triajes     = triage_repository.count_total()
    triajes_por_color = triage_repository.count_by_color()
    por_dia           = triage_repository.count_per_day(dias_actuales)
    total_anterior    = triage_repository.count_in_date_range(fecha_ini_anterior, fecha_fin_anterior)
    por_ciudad_raw    = triage_repository.count_by_ciudad_and_color()

    SEVERITY = {"Verde": 1, "Amarillo": 2, "Naranja": 3, "Rojo": 4}
    por_ciudad_agg: dict = {}
    for row in por_ciudad_raw:
        c = row["ciudad"]
        if c not in por_ciudad_agg:
            por_ciudad_agg[c] = {"total": 0, "peor_nivel": "Verde"}
        por_ciudad_agg[c]["total"] += row["total"]
        if SEVERITY.get(row["triage_color"], 0) > SEVERITY.get(por_ciudad_agg[c]["peor_nivel"], 0):
            por_ciudad_agg[c]["peor_nivel"] = row["triage_color"]
    por_ciudad = [
        {"ciudad": c, "total": d["total"], "peor_nivel": d["peor_nivel"]}
        for c, d in sorted(por_ciudad_agg.items(), key=lambda x: -x[1]["total"])
    ]

    total_actual = sum(d["total"] for d in por_dia)
    cambio_pct   = None
    if total_anterior > 0:
        cambio_pct = round(((total_actual - total_anterior) / total_anterior) * 100)

    return {
        "usuarios": {r["role"]: r["total"] for r in usuarios_por_rol},
        "triajes": {
            "total":          total_triajes,
            "por_color":      {r["triage_color"]: r["total"] for r in triajes_por_color},
            "por_dia":        por_dia,
            "total_semana":   total_actual,
            "cambio_semanal": cambio_pct,
            "por_ciudad":     por_ciudad,
        },
    }


# Horarios de médicos

def get_horarios_medico(email: str) -> list:
    return [dict(r) for r in horario_repository.list_by_medico(email)]


def set_horario_medico(email: str, dia_semana: int, hora_inicio: str,
                       hora_fin: str, admin_email: str) -> dict:
    if dia_semana < 0 or dia_semana > 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="dia_semana debe ser 0 (Lunes) a 6 (Domingo).",
        )
    if not user_repository.is_medico(email):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Médico no encontrado.")
    horario_repository.upsert(email, dia_semana, hora_inicio, hora_fin)
    logger.info(f"Horario asignado por admin | médico: {email} | día {dia_semana} | por: {admin_email}")
    return {"message": "Horario guardado correctamente."}


def delete_horario_medico(email: str, dia_semana: int, admin_email: str) -> dict:
    horario_repository.delete(email, dia_semana)
    logger.info(f"Horario eliminado por admin | médico: {email} | día {dia_semana} | por: {admin_email}")
    return {"message": "Horario eliminado correctamente."}


# Alertas críticas

def list_alertas() -> list:
    return [dict(r) for r in triage_repository.list_alertas()]


def atender_alerta(alerta_id: int, admin_email: str) -> dict:
    affected = triage_repository.atender_alerta(alerta_id)
    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Alerta no encontrada.")
    logger.info(f"Alerta {alerta_id} atendida | admin: {admin_email}")
    return {"ok": True}


def ignorar_alerta(alerta_id: int, admin_email: str) -> dict:
    affected = triage_repository.delete_alerta(alerta_id)
    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Alerta no encontrada.")
    logger.info(f"Alerta {alerta_id} eliminada (ignorada) | admin: {admin_email}")
    return {"ok": True}


# Solicitudes de acceso médico

def list_solicitudes(estado) -> list:
    return [dict(r) for r in solicitud_repository.list_with_filter(estado)]


def accion_solicitud(solicitud_id: int, accion: str, admin_email: str) -> dict:
    sol = solicitud_repository.find_by_id(solicitud_id)
    if not sol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Solicitud no encontrada.")
    sol = dict(sol)
    if sol["estado"] != "pendiente":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Esta solicitud ya fue procesada.")

    if accion == "rechazar":
        solicitud_repository.update_estado(solicitud_id, "rechazada")
        logger.info(f"Solicitud {solicitud_id} rechazada | admin: {admin_email}")
        return {"ok": True, "accion": "rechazada"}

    if user_repository.exists(sol["email"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Ya existe un usuario con este correo.")

    alphabet     = string.ascii_letters + string.digits
    temp_password = "".join(secrets.choice(alphabet) for _ in range(12))
    hashed_pw    = hash_password(temp_password)
    now          = datetime.now(timezone.utc).isoformat()

    user_repository.create_medico_from_solicitud(
        sol["nombre"], sol["email"], hashed_pw,
        sol["numero_documento"], sol["telefono"], now,
    )
    solicitud_repository.update_estado(solicitud_id, "aceptada")

    try:
        send_doctor_credentials_email(sol["email"], sol["nombre"], temp_password)
    except Exception as e:
        logger.error(f"Credenciales creadas pero no se pudo enviar email a {sol['email']}: {e}")

    logger.info(f"Solicitud {solicitud_id} aceptada | médico creado: {sol['email']} | admin: {admin_email}")
    return {"ok": True, "accion": "aceptada", "medico_email": sol["email"]}
