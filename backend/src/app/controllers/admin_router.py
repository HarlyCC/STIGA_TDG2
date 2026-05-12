import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator

from app.core.security import get_current_user, validate_fecha_nacimiento
from app.services import admin_service

logger = logging.getLogger("stiga.admin")

router = APIRouter(prefix="/admin", tags=["Administración"])


# Validación de rol

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al administrador.",
        )
    return current_user


# Modelos de solicitud

VALID_ROLES = {"medico", "admin"}


class CreateUserRequest(BaseModel):
    nombre:           str
    email:            EmailStr
    password:         str
    role:             str
    cedula:           Optional[str] = None
    telefono:         Optional[str] = None
    direccion:        Optional[str] = None
    eps:              Optional[str] = None
    ciudad:           Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    gender:           Optional[int] = None

    @field_validator("role")
    @classmethod
    def check_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Rol inválido. Use: {', '.join(VALID_ROLES)}.")
        return v

    @field_validator("fecha_nacimiento")
    @classmethod
    def check_fecha(cls, v: Optional[str]) -> Optional[str]:
        return validate_fecha_nacimiento(v)


class UpdateRoleRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def check_role(cls, v: str) -> str:
        roles = {"paciente", "medico", "admin"}
        if v not in roles:
            raise ValueError(f"Rol inválido. Use: {', '.join(roles)}.")
        return v


class ScheduleRequest(BaseModel):
    dia_semana:  int
    hora_inicio: str
    hora_fin:    str


class SolicitudAccionRequest(BaseModel):
    accion: str  # 'aceptar' | 'rechazar'

    @field_validator("accion")
    @classmethod
    def check_accion(cls, v: str) -> str:
        if v not in ("aceptar", "rechazar"):
            raise ValueError("accion debe ser 'aceptar' o 'rechazar'.")
        return v


# Gestión de usuarios

@router.post("/usuarios", status_code=status.HTTP_201_CREATED)
def create_user(body: CreateUserRequest, admin: dict = Depends(require_admin)):
    return admin_service.create_user(body.model_dump(), admin["email"])


@router.get("/usuarios")
def list_users(
    role:   Optional[str] = None,
    limit:  int = 100,
    offset: int = 0,
    admin:  dict = Depends(require_admin),
):
    return admin_service.list_users(role, limit, offset)


@router.put("/usuarios/{email}/rol")
def change_role(email: str, body: UpdateRoleRequest, admin: dict = Depends(require_admin)):
    return admin_service.change_role(email, body.role, admin["email"])


@router.patch("/usuarios/{email}/aprobar")
def approve_user(email: str, admin: dict = Depends(require_admin)):
    return admin_service.approve_user(email, admin["email"])


@router.delete("/usuarios/{email}")
def delete_user(email: str, admin: dict = Depends(require_admin)):
    if email == admin["email"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminar su propia cuenta.",
        )
    return admin_service.delete_user(email, admin["email"])


# Estadísticas

@router.get("/estadisticas")
def estadisticas(admin: dict = Depends(require_admin)):
    return admin_service.estadisticas()


# Horarios de médicos

@router.get("/medicos/{email}/horarios")
def get_horarios_medico(email: str, admin: dict = Depends(require_admin)):
    return admin_service.get_horarios_medico(email)


@router.put("/medicos/{email}/horarios")
def set_horario_medico(email: str, body: ScheduleRequest, admin: dict = Depends(require_admin)):
    return admin_service.set_horario_medico(
        email, body.dia_semana, body.hora_inicio, body.hora_fin, admin["email"]
    )


@router.delete("/medicos/{email}/horarios/{dia_semana}")
def delete_horario_medico(email: str, dia_semana: int, admin: dict = Depends(require_admin)):
    return admin_service.delete_horario_medico(email, dia_semana, admin["email"])


# Alertas críticas

@router.get("/alertas")
def list_alertas(admin: dict = Depends(require_admin)):
    return admin_service.list_alertas()


@router.put("/alertas/{alerta_id}/atender")
def atender_alerta(alerta_id: int, admin: dict = Depends(require_admin)):
    return admin_service.atender_alerta(alerta_id, admin["email"])


@router.delete("/alertas/{alerta_id}")
def ignorar_alerta(alerta_id: int, admin: dict = Depends(require_admin)):
    return admin_service.ignorar_alerta(alerta_id, admin["email"])


# Solicitudes de acceso médico

@router.get("/solicitudes")
def list_solicitudes(estado: Optional[str] = None, admin: dict = Depends(require_admin)):
    return admin_service.list_solicitudes(estado)


@router.put("/solicitudes/{solicitud_id}/accion")
def accion_solicitud(
    solicitud_id: int,
    body: SolicitudAccionRequest,
    admin: dict = Depends(require_admin),
):
    return admin_service.accion_solicitud(solicitud_id, body.accion, admin["email"])
