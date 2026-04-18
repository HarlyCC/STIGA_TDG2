import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.data.database import get_conn
from app.validation.dependencies import get_current_user

logger = logging.getLogger("stiga.medico")

router = APIRouter(prefix="/medico", tags=["Médico"])

# ── Dependencia de rol ────────────────────────────────────────────────────────

def require_medico(current_user: dict = Depends(get_current_user)) -> dict:
    """Rechaza la petición si el usuario autenticado no es médico ni admin."""
    if current_user["role"] not in ("medico", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al personal médico.",
        )
    return current_user


# ── Modelos ───────────────────────────────────────────────────────────────────

class HorarioRequest(BaseModel):
    dia_semana:  int    # 0=Lunes … 6=Domingo
    hora_inicio: str    # HH:MM
    hora_fin:    str    # HH:MM


# ── Pacientes y triajes ───────────────────────────────────────────────────────

@router.get("/pacientes")
def listar_pacientes(
    color:   Optional[str] = None,
    medico:  dict = Depends(require_medico),
):
    """
    Lista todos los triajes registrados con los datos del paciente y su clasificación.
    Permite filtrar por color de triaje (Verde, Amarillo, Naranja, Rojo).
    """
    query  = "SELECT * FROM triage_records"
    params = []

    if color:
        query  += " WHERE triage_color = ?"
        params.append(color)

    query += " ORDER BY timestamp DESC"

    with get_conn() as conn:
        rows = conn.execute(query, params).fetchall()

    return [dict(r) for r in rows]


@router.get("/pacientes/{cedula}")
def detalle_paciente(
    cedula: str,
    medico: dict = Depends(require_medico),
):
    """
    Retorna todos los triajes de un paciente identificado por cédula,
    junto con sus datos personales del perfil.
    """
    with get_conn() as conn:
        perfil = conn.execute(
            """SELECT nombre, email, cedula, telefono, direccion,
                      eps, ciudad, fecha_nacimiento, gender
               FROM users WHERE cedula = ?""",
            (cedula,),
        ).fetchone()

    if not perfil:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Paciente no encontrado.")

    with get_conn() as conn:
        triajes = conn.execute(
            "SELECT * FROM triage_records WHERE cedula = ? ORDER BY timestamp DESC",
            (cedula,),
        ).fetchall()

    return {
        "perfil":  dict(perfil),
        "triajes": [dict(t) for t in triajes],
    }


# ── Historial del paciente (para el paciente autenticado) ─────────────────────

@router.get("/mis-triajes")
def mis_triajes(current_user: dict = Depends(get_current_user)):
    """
    Retorna el historial de triajes del paciente autenticado,
    ordenados del más reciente al más antiguo.
    """
    with get_conn() as conn:
        user = conn.execute(
            "SELECT cedula FROM users WHERE email = ?",
            (current_user["email"],),
        ).fetchone()

    if not user or not user["cedula"]:
        return []

    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM triage_records WHERE cedula = ? ORDER BY timestamp DESC",
            (user["cedula"],),
        ).fetchall()

    return [dict(r) for r in rows]


# ── Disponibilidad horaria ────────────────────────────────────────────────────

@router.get("/horarios")
def get_horarios(medico: dict = Depends(require_medico)):
    """Retorna la franja horaria configurada por el médico autenticado."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT dia_semana, hora_inicio, hora_fin FROM medico_horarios WHERE medico_email = ? ORDER BY dia_semana",
            (medico["email"],),
        ).fetchall()

    return [dict(r) for r in rows]


@router.put("/horarios")
def set_horario(
    body:   HorarioRequest,
    medico: dict = Depends(require_medico),
):
    """
    Crea o actualiza la disponibilidad del médico para un día específico.
    Si ya existe un horario para ese día, lo reemplaza.
    """
    if body.dia_semana < 0 or body.dia_semana > 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="dia_semana debe ser 0 (Lunes) a 6 (Domingo).")

    with get_conn() as conn:
        conn.execute(
            """INSERT INTO medico_horarios (medico_email, dia_semana, hora_inicio, hora_fin)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(medico_email, dia_semana)
               DO UPDATE SET hora_inicio = excluded.hora_inicio,
                             hora_fin    = excluded.hora_fin""",
            (medico["email"], body.dia_semana, body.hora_inicio, body.hora_fin),
        )

    logger.info(f"Horario actualizado | {medico['email']} | día {body.dia_semana}")
    return {"message": "Horario guardado correctamente."}


@router.delete("/horarios/{dia_semana}")
def delete_horario(
    dia_semana: int,
    medico:     dict = Depends(require_medico),
):
    """Elimina la disponibilidad del médico para un día específico."""
    with get_conn() as conn:
        conn.execute(
            "DELETE FROM medico_horarios WHERE medico_email = ? AND dia_semana = ?",
            (medico["email"], dia_semana),
        )

    logger.info(f"Horario eliminado | {medico['email']} | día {dia_semana}")
    return {"message": "Horario eliminado correctamente."}
