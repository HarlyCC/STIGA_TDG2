import logging
import uuid
from datetime import date as date_type, datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.repositories import (
    user_repository,
    triage_repository,
    cita_repository,
    horario_repository,
    nota_repository,
)

logger = logging.getLogger("stiga.doctor_service")


# Vista de pacientes

def list_patients(role: str, medico_email: str, color, limit: int, offset: int) -> dict:
    limit  = min(limit, 500)
    offset = max(offset, 0)
    if role == "admin":
        total, rows = triage_repository.list_all(color, limit, offset)
    else:
        total, rows = triage_repository.list_by_medico(medico_email, color, limit, offset)
    return {"total": total, "items": [dict(r) for r in rows]}


def _check_medico_access(medico_email: str, role: str, cedula: str):
    if role == "admin":
        return
    if not cita_repository.medico_has_access(medico_email, cedula):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes una consulta asignada con este paciente.",
        )


def patient_detail(cedula: str, medico_email: str, role: str) -> dict:
    _check_medico_access(medico_email, role, cedula)
    perfil = user_repository.find_by_cedula(cedula)
    if not perfil:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Paciente no encontrado.")
    triajes = triage_repository.list_by_cedula(cedula)
    return {"perfil": dict(perfil), "triajes": [dict(t) for t in triajes]}


def get_historia(cedula: str, medico_email: str, role: str) -> dict:
    _check_medico_access(medico_email, role, cedula)
    perfil = user_repository.find_by_cedula(cedula)
    if not perfil:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Paciente no encontrado.")
    triajes = triage_repository.list_by_cedula(cedula)
    notas   = nota_repository.list_by_cedula(cedula)
    return {
        "perfil":  dict(perfil),
        "triajes": [dict(t) for t in triajes],
        "notas":   [dict(n) for n in notas],
    }


def add_nota(cedula: str, medico_email: str, medico_nombre: str,
             titulo: str, contenido: str, role: str) -> dict:
    _check_medico_access(medico_email, role, cedula)
    perfil = user_repository.find_by_cedula(cedula)
    if not perfil:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Paciente no encontrado.")
    now = datetime.now(timezone.utc).isoformat()
    nota_id = nota_repository.insert(cedula, medico_email, medico_nombre, titulo, contenido, now)
    logger.info(f"Nota clínica guardada | paciente: {cedula} | médico: {medico_email}")
    return {"id": nota_id, "ok": True}


def my_triages(user_email: str) -> list:
    return [dict(r) for r in triage_repository.list_by_user(user_email)]


# Horarios y disponibilidad

def get_schedule(medico_email: str) -> list:
    return [dict(r) for r in horario_repository.list_by_medico(medico_email)]


def get_availability(fecha: str) -> list:
    try:
        date_obj = date_type.fromisoformat(fecha)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Formato de fecha inválido. Use AAAA-MM-DD.",
        )
    if date_obj < date_type.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha no puede ser en el pasado.",
        )

    dia_semana = date_obj.weekday()
    horarios   = horario_repository.list_by_dia(dia_semana)
    if not horarios:
        return []

    all_slots: set = set()
    for h in horarios:
        start = datetime.strptime(h["hora_inicio"], "%H:%M")
        end   = datetime.strptime(h["hora_fin"],   "%H:%M")
        cur   = start
        while cur < end:
            all_slots.add(cur.strftime("%H:%M"))
            cur += timedelta(hours=1)

    taken_rows = cita_repository.list_taken_slots(fecha)
    occupied   = {r["hora_solicitada"] for r in taken_rows}
    now_time   = datetime.now().strftime("%H:%M") if date_obj == date_type.today() else None

    return [
        {
            "hora": slot,
            "disponible": slot not in occupied and (now_time is None or slot > now_time),
        }
        for slot in sorted(all_slots)
    ]


# Citas

COLORES_CRITICOS = ("Rojo", "Naranja")

def create_appointment(user_email: str, triaje_id: int, fecha_solicitada: str, hora_solicitada: str) -> dict:
    triaje = triage_repository.find_by_id_and_user(triaje_id, user_email)
    if not triaje:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Triaje no encontrado o no pertenece a este paciente.",
        )
    if triaje["triage_color"] in COLORES_CRITICOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"El triaje tiene nivel {triaje['triage_color']}. "
                "Requiere atención de emergencia presencial, no teleconsulta."
            ),
        )
    duplicate = cita_repository.find_active_by_paciente_and_triaje(user_email, triaje_id)
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una cita activa para este triaje.",
        )
    now        = datetime.now(timezone.utc).isoformat()
    room_token = uuid.uuid4().hex
    cita_id    = cita_repository.insert(
        user_email, triaje_id, fecha_solicitada, hora_solicitada, now, room_token
    )
    logger.info(f"Cita creada | {user_email} | id: {cita_id}")
    return {"id": f"TC-{cita_id:05d}", "status": "pendiente"}


def my_appointments(user_email: str) -> list:
    return [dict(r) for r in cita_repository.list_by_paciente(user_email)]


def list_appointments(medico_email: str) -> list:
    return [dict(r) for r in cita_repository.list_for_medico(medico_email)]


def toggle_llamada(cita_id: int, medico_email: str, en_llamada: bool) -> dict:
    affected = cita_repository.update_llamada(cita_id, medico_email, en_llamada)
    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Cita no encontrada.")
    action = "iniciada" if en_llamada else "completada"
    logger.info(f"Cita {cita_id} {action} | médico: {medico_email}")
    return {"ok": True}


def update_appointment_status(cita_id: int, new_status: str, medico_email: str) -> dict:
    cita = cita_repository.find_by_id(cita_id)
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Cita no encontrada.")

    cita_dict  = dict(cita)
    current    = cita_dict["status"]
    asignado_a = cita_dict["medico_email"]

    if new_status == "cancelada" and current != "confirmada":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Solo se pueden cancelar citas confirmadas.")
    if new_status == "cancelada" and asignado_a != medico_email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Solo el médico asignado puede cancelar esta cita.")
    if new_status in ("confirmada", "rechazada") and current != "pendiente":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="Solo se pueden aceptar o rechazar citas pendientes.")

    if new_status == "confirmada":
        cita_repository.update_status(
            cita_id, new_status, medico_email,
            cita_dict.get("fecha_solicitada"),
            cita_dict.get("hora_solicitada"),
        )
    else:
        cita_repository.update_status(cita_id, new_status, None, None, None)

    logger.info(f"Cita {cita_id} → {new_status} | médico: {medico_email}")
    return {"id": cita_id, "status": new_status}
