import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from app.data.database import get_conn
from datetime import datetime, timezone
from app.validation.auth_service import CODE_EXPIRE_MINUTES
from app.validation.dependencies import (
    get_current_user,
    hash_password,
    validate_fecha_nacimiento,
)

logger = logging.getLogger("stiga.admin")

router = APIRouter(prefix="/admin", tags=["Administración"])

# ── Dependencia de rol ────────────────────────────────────────────────────────

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Rechaza la petición si el usuario autenticado no es admin."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al administrador.",
        )
    return current_user


# ── Modelos ───────────────────────────────────────────────────────────────────

ROLES_VALIDOS = {"medico", "admin"}

class CreateUserRequest(BaseModel):
    nombre:           str
    email:            EmailStr
    password:         str
    role:             str               # 'medico' o 'admin'
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
        if v not in ROLES_VALIDOS:
            raise ValueError(f"Rol inválido. Use: {', '.join(ROLES_VALIDOS)}.")
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


# ── Gestión de usuarios ───────────────────────────────────────────────────────

@router.post("/usuarios", status_code=status.HTTP_201_CREATED)
def create_user(
    body:  CreateUserRequest,
    admin: dict = Depends(require_admin),
):
    """
    Crea una cuenta de médico o admin directamente verificada.
    No requiere validación por correo — el admin asigna las credenciales.
    """
    if len(body.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )

    hashed_pw = hash_password(body.password)
    now       = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (body.email,)
        ).fetchone()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un usuario con este correo.",
            )

        conn.execute(
            """INSERT INTO users
               (nombre, email, hashed_password, role, is_verified,
                cedula, telefono, direccion, eps, ciudad,
                fecha_nacimiento, gender, created_at)
               VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                body.nombre, body.email, hashed_pw, body.role,
                body.cedula, body.telefono, body.direccion,
                body.eps, body.ciudad, body.fecha_nacimiento, body.gender,
                now,
            ),
        )

    logger.info(f"Usuario creado por admin | {body.email} | rol: {body.role} | por: {admin['email']}")
    return {"message": f"Cuenta de {body.role} creada correctamente para {body.email}."}


@router.get("/usuarios")
def listar_usuarios(
    role:  Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    """
    Lista todos los usuarios del sistema.
    Filtro opcional por rol: ?role=medico | paciente | admin
    """
    query  = """SELECT id, nombre, email, role, is_verified,
                       cedula, telefono, ciudad, created_at
                FROM users"""
    params = []

    if role:
        query  += " WHERE role = ?"
        params.append(role)

    query += " ORDER BY created_at DESC"

    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()

    return [dict(r) for r in rows]


@router.get("/usuarios/{email}")
def detalle_usuario(
    email: str,
    admin: dict = Depends(require_admin),
):
    """Retorna el perfil completo de un usuario por su correo."""
    with get_conn() as conn:
        user = conn.execute(
            """SELECT id, nombre, email, role, is_verified,
                      cedula, telefono, direccion, eps, ciudad,
                      fecha_nacimiento, gender, created_at
               FROM users WHERE email = ?""",
            (email,),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")
    return dict(user)


@router.put("/usuarios/{email}/rol")
def cambiar_rol(
    email: str,
    body:  UpdateRoleRequest,
    admin: dict = Depends(require_admin),
):
    """Cambia el rol de un usuario existente."""
    with get_conn() as conn:
        affected = conn.execute(
            "UPDATE users SET role = ? WHERE email = ?", (body.role, email)
        ).rowcount

    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")

    logger.info(f"Rol actualizado | {email} → {body.role} | por: {admin['email']}")
    return {"message": f"Rol actualizado a '{body.role}' correctamente."}


@router.delete("/usuarios/{email}")
def eliminar_usuario(
    email: str,
    admin: dict = Depends(require_admin),
):
    """Elimina un usuario del sistema. No se puede eliminar a sí mismo."""
    if email == admin["email"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puede eliminar su propia cuenta.",
        )

    with get_conn() as conn:
        affected = conn.execute(
            "DELETE FROM users WHERE email = ?", (email,)
        ).rowcount

    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Usuario no encontrado.")

    logger.info(f"Usuario eliminado | {email} | por: {admin['email']}")
    return {"message": f"Usuario {email} eliminado correctamente."}


# ── Estadísticas generales ────────────────────────────────────────────────────

@router.get("/estadisticas")
def estadisticas(admin: dict = Depends(require_admin)):
    """
    Resumen general del sistema: total de usuarios por rol,
    total de triajes y distribución por color de clasificación.
    """
    with get_conn() as conn:
        usuarios_por_rol = conn.execute(
            "SELECT role, COUNT(*) as total FROM users GROUP BY role"
        ).fetchall()

        total_triajes = conn.execute(
            "SELECT COUNT(*) as total FROM triage_records"
        ).fetchone()["total"]

        triajes_por_color = conn.execute(
            "SELECT triage_color, COUNT(*) as total FROM triage_records GROUP BY triage_color"
        ).fetchall()

    return {
        "usuarios": {r["role"]: r["total"] for r in usuarios_por_rol},
        "triajes": {
            "total":       total_triajes,
            "por_color":   {r["triage_color"]: r["total"] for r in triajes_por_color},
        },
    }


# ── Gestión de horarios de médicos ───────────────────────────────────────────

class HorarioRequest(BaseModel):
    dia_semana:  int   # 0=Lunes … 6=Domingo
    hora_inicio: str   # HH:MM
    hora_fin:    str   # HH:MM


@router.get("/medicos/{email}/horarios")
def get_horarios_medico(
    email: str,
    admin: dict = Depends(require_admin),
):
    """Retorna los horarios configurados para un médico específico."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT dia_semana, hora_inicio, hora_fin FROM medico_horarios WHERE medico_email = ? ORDER BY dia_semana",
            (email,),
        ).fetchall()

    return [dict(r) for r in rows]


@router.put("/medicos/{email}/horarios")
def set_horario_medico(
    email: str,
    body:  HorarioRequest,
    admin: dict = Depends(require_admin),
):
    """Crea o actualiza la disponibilidad de un médico para un día específico."""
    if body.dia_semana < 0 or body.dia_semana > 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="dia_semana debe ser 0 (Lunes) a 6 (Domingo).")

    with get_conn() as conn:
        medico = conn.execute(
            "SELECT id FROM users WHERE email = ? AND role = 'medico'", (email,)
        ).fetchone()

        if not medico:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Médico no encontrado.")

        conn.execute(
            """INSERT INTO medico_horarios (medico_email, dia_semana, hora_inicio, hora_fin)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(medico_email, dia_semana)
               DO UPDATE SET hora_inicio = excluded.hora_inicio,
                             hora_fin    = excluded.hora_fin""",
            (email, body.dia_semana, body.hora_inicio, body.hora_fin),
        )

    logger.info(f"Horario asignado por admin | médico: {email} | día {body.dia_semana} | por: {admin['email']}")
    return {"message": "Horario guardado correctamente."}


@router.delete("/medicos/{email}/horarios/{dia_semana}")
def delete_horario_medico(
    email:      str,
    dia_semana: int,
    admin:      dict = Depends(require_admin),
):
    """Elimina la disponibilidad de un médico para un día específico."""
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM medico_horarios WHERE medico_email = ? AND dia_semana = ?",
            (email, dia_semana),
        )

    logger.info(f"Horario eliminado por admin | médico: {email} | día {dia_semana} | por: {admin['email']}")
    return {"message": "Horario eliminado correctamente."}
