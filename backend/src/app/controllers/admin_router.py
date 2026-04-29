import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from app.data.database import get_conn
from datetime import date as date_type, datetime, timedelta, timezone
from app.services.auth_service import CODE_EXPIRE_MINUTES
from app.core.security import (
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

VALID_ROLES = {"medico", "admin"}

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
def list_users(
    role:   Optional[str] = None,
    limit:  int = 100,
    offset: int = 0,
    admin:  dict = Depends(require_admin),
):
    """
    Lista usuarios del sistema con paginación.
    ?role=medico|paciente|admin  ?limit=100  ?offset=0
    """
    conditions, params = [], []
    if role:
        conditions.append("role = ?")
        params.append(role)

    where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""SELECT id, nombre, email, role, is_verified,
                       cedula, telefono, ciudad, created_at
                FROM users{where}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?"""
    params += [min(limit, 500), max(offset, 0)]

    with get_conn() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM users{where}", params[:-2]
        ).fetchone()[0]
        rows = conn.execute(query, params).fetchall()

    return {"total": total, "items": [dict(r) for r in rows]}


@router.get("/usuarios/{email}")
def get_user(
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
def change_role(
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
def delete_user(
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
    hoy = date_type.today()
    dias_actuales = [(hoy - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    fecha_ini_anterior = (hoy - timedelta(days=14)).isoformat()
    fecha_fin_anterior = (hoy - timedelta(days=7)).isoformat()

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

        por_dia = []
        for fecha in dias_actuales:
            count = conn.execute(
                "SELECT COUNT(*) as total FROM triage_records WHERE DATE(timestamp) = ?",
                (fecha,)
            ).fetchone()["total"]
            por_dia.append({"fecha": fecha, "total": count})

        total_anterior = conn.execute(
            "SELECT COUNT(*) as total FROM triage_records WHERE DATE(timestamp) >= ? AND DATE(timestamp) < ?",
            (fecha_ini_anterior, fecha_fin_anterior)
        ).fetchone()["total"]

        por_ciudad_raw = conn.execute(
            """SELECT ciudad, triage_color, COUNT(*) as total
               FROM triage_records
               WHERE ciudad IS NOT NULL AND ciudad != ''
               GROUP BY ciudad, triage_color"""
        ).fetchall()

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
    cambio_pct = None
    if total_anterior > 0:
        cambio_pct = round(((total_actual - total_anterior) / total_anterior) * 100)

    return {
        "usuarios": {r["role"]: r["total"] for r in usuarios_por_rol},
        "triajes": {
            "total":           total_triajes,
            "por_color":       {r["triage_color"]: r["total"] for r in triajes_por_color},
            "por_dia":         por_dia,
            "total_semana":    total_actual,
            "cambio_semanal":  cambio_pct,
            "por_ciudad":      por_ciudad,
        },
    }


# ── Gestión de horarios de médicos ───────────────────────────────────────────

class ScheduleRequest(BaseModel):
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
    body:  ScheduleRequest,
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


# ── Alertas de triaje crítico ─────────────────────────────────────────────────

@router.get("/alertas")
def list_alertas(admin: dict = Depends(require_admin)):
    """Retorna todas las alertas: pendientes primero, luego el historial de atendidas."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM alertas_criticas ORDER BY leida ASC, created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


@router.put("/alertas/{alerta_id}/atender")
def atender_alerta(alerta_id: int, admin: dict = Depends(require_admin)):
    """Marca una alerta como atendida — queda en el historial."""
    with get_conn() as conn:
        affected = conn.execute(
            "UPDATE alertas_criticas SET leida = 1, estado = 'atendida' WHERE id = ?",
            (alerta_id,),
        ).rowcount
    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada.")
    logger.info(f"Alerta {alerta_id} atendida | admin: {admin['email']}")
    return {"ok": True}


@router.delete("/alertas/{alerta_id}")
def ignorar_alerta(alerta_id: int, admin: dict = Depends(require_admin)):
    """Elimina una alerta por completo (ignorar)."""
    with get_conn() as conn:
        affected = conn.execute(
            "DELETE FROM alertas_criticas WHERE id = ?", (alerta_id,)
        ).rowcount
    if affected == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alerta no encontrada.")
    logger.info(f"Alerta {alerta_id} eliminada (ignorada) | admin: {admin['email']}")
    return {"ok": True}


# ── Asignación de médico a triaje ─────────────────────────────────────────────

class AsignarMedicoRequest(BaseModel):
    medico_email: EmailStr


@router.put("/triajes/{triaje_id}/asignar-medico")
def asignar_medico_triaje(
    triaje_id: int,
    body: AsignarMedicoRequest,
    admin: dict = Depends(require_admin),
):
    """Asigna un médico a un registro de triaje."""
    with get_conn() as conn:
        medico = conn.execute(
            "SELECT email FROM users WHERE email = ? AND role = 'medico'",
            (body.medico_email,),
        ).fetchone()
        if not medico:
            raise HTTPException(status_code=404, detail="Médico no encontrado.")

        affected = conn.execute(
            "UPDATE triage_records SET medico_email = ? WHERE id = ?",
            (body.medico_email, triaje_id),
        ).rowcount

    if affected == 0:
        raise HTTPException(status_code=404, detail="Triaje no encontrado.")

    logger.info(f"Médico {body.medico_email} asignado a triaje {triaje_id} | admin: {admin['email']}")
    return {"ok": True, "medico_email": body.medico_email}
