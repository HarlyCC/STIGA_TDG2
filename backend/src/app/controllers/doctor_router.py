import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.services import doctor_service

logger = logging.getLogger("stiga.medico")

router = APIRouter(prefix="/medico", tags=["Médico"])


# Validación de rol

def require_medico(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] not in ("medico", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al personal médico.",
        )
    return current_user


# Modelos de solicitud

class AppointmentRequest(BaseModel):
    triaje_id:        Optional[int] = None
    fecha_solicitada: Optional[str] = None
    hora_solicitada:  Optional[str] = None


class LlamadaUpdate(BaseModel):
    en_llamada: bool


class StatusUpdate(BaseModel):
    status: str  # 'confirmada' | 'rechazada' | 'cancelada'


# Pacientes y triajes

@router.get("/pacientes")
def list_patients(
    color:  Optional[str] = None,
    limit:  int = 100,
    offset: int = 0,
    medico: dict = Depends(require_medico),
):
    return doctor_service.list_patients(medico["role"], medico["email"], color, limit, offset)


@router.get("/pacientes/{cedula}")
def patient_detail(cedula: str, medico: dict = Depends(require_medico)):
    return doctor_service.patient_detail(cedula)


@router.get("/mis-triajes")
def my_triages(current_user: dict = Depends(get_current_user)):
    return doctor_service.my_triages(current_user["email"])


# Horarios y disponibilidad

@router.get("/horarios")
def get_schedule(medico: dict = Depends(require_medico)):
    return doctor_service.get_schedule(medico["email"])


@router.get("/disponibilidad")
def get_availability(fecha: str, current_user: dict = Depends(get_current_user)):
    return doctor_service.get_availability(fecha)


# Citas

@router.post("/mis-citas", status_code=201)
def create_appointment(body: AppointmentRequest, current_user: dict = Depends(get_current_user)):
    return doctor_service.create_appointment(
        current_user["email"], body.triaje_id, body.fecha_solicitada, body.hora_solicitada
    )


@router.get("/mis-citas")
def my_appointments(current_user: dict = Depends(get_current_user)):
    return doctor_service.my_appointments(current_user["email"])


@router.get("/citas")
def list_appointments(medico: dict = Depends(require_medico)):
    return doctor_service.list_appointments(medico["email"])


@router.put("/citas/{cita_id}/llamada")
def toggle_llamada(
    cita_id: int,
    body: LlamadaUpdate,
    medico: dict = Depends(require_medico),
):
    return doctor_service.toggle_llamada(cita_id, medico["email"], body.en_llamada)


@router.put("/citas/{cita_id}/status")
def update_appointment_status(
    cita_id: int,
    body: StatusUpdate,
    medico: dict = Depends(require_medico),
):
    if body.status not in ("confirmada", "rechazada", "cancelada"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="status debe ser 'confirmada', 'rechazada' o 'cancelada'.",
        )
    return doctor_service.update_appointment_status(cita_id, body.status, medico["email"])
