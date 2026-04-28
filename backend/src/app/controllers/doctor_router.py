import logging
from datetime import date as date_type, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.data.database import get_conn
from app.core.security import get_current_user

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


# ── Pacientes y triajes ───────────────────────────────────────────────────────

@router.get("/pacientes")
def list_patients(
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
def patient_detail(
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
def my_triages(current_user: dict = Depends(get_current_user)):
    """
    Retorna el historial de triajes del paciente autenticado,
    ordenados del más reciente al más antiguo.
    """
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM triage_records WHERE user_email = ? ORDER BY timestamp DESC",
            (current_user["email"],),
        ).fetchall()

    return [dict(r) for r in rows]


# ── Disponibilidad horaria ────────────────────────────────────────────────────

@router.get("/horarios")
def get_schedule(medico: dict = Depends(require_medico)):
    """Retorna la franja horaria configurada por el médico autenticado."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT dia_semana, hora_inicio, hora_fin FROM medico_horarios WHERE medico_email = ? ORDER BY dia_semana",
            (medico["email"],),
        ).fetchall()

    return [dict(r) for r in rows]


# ── Disponibilidad pública para pacientes ────────────────────────────────────

@router.get("/disponibilidad")
def get_availability(fecha: str, current_user: dict = Depends(get_current_user)):
    """
    Returns available 1-hour slots for a given date based on all doctors' schedules.
    Slots already taken by existing appointments are marked unavailable.
    fecha: YYYY-MM-DD
    """
    try:
        date_obj = date_type.fromisoformat(fecha)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )

    if date_obj < date_type.today():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Date cannot be in the past.",
        )

    # weekday(): 0=Monday … 6=Sunday — matches medico_horarios.dia_semana convention
    dia_semana = date_obj.weekday()

    with get_conn() as conn:
        horarios = conn.execute(
            "SELECT hora_inicio, hora_fin FROM medico_horarios WHERE dia_semana = ?",
            (dia_semana,),
        ).fetchall()

    if not horarios:
        return []

    # Union of all 1-hour slots across every doctor that works that day
    all_slots: set[str] = set()
    for h in horarios:
        start = datetime.strptime(h["hora_inicio"], "%H:%M")
        end   = datetime.strptime(h["hora_fin"],   "%H:%M")
        cur   = start
        while cur < end:
            all_slots.add(cur.strftime("%H:%M"))
            cur += timedelta(hours=1)

    # Mark slots that already have a pending/confirmed appointment that day
    with get_conn() as conn:
        taken_rows = conn.execute(
            "SELECT hora_solicitada FROM citas WHERE fecha_solicitada = ? AND status != 'cancelada'",
            (fecha,),
        ).fetchall()

    occupied = {r["hora_solicitada"] for r in taken_rows}

    return [
        {"hora": slot, "disponible": slot not in occupied}
        for slot in sorted(all_slots)
    ]


# ── Citas (solicitudes de teleconsulta) ───────────────────────────────────────

class AppointmentRequest(BaseModel):
    triaje_id:        Optional[int] = None
    fecha_solicitada: Optional[str] = None
    hora_solicitada:  Optional[str] = None


@router.post("/mis-citas", status_code=201)
def create_appointment(body: AppointmentRequest, current_user: dict = Depends(get_current_user)):
    """Registra una solicitud de teleconsulta del paciente autenticado."""
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO citas
               (paciente_email, triaje_id, fecha_solicitada, hora_solicitada, status, creado_en)
               VALUES (?, ?, ?, ?, 'pendiente', ?)""",
            (current_user["email"], body.triaje_id, body.fecha_solicitada, body.hora_solicitada, now),
        )
        cita_id = cur.lastrowid
    logger.info(f"Cita creada | {current_user['email']} | id: {cita_id}")
    return {"id": f"TC-{cita_id:05d}", "status": "pendiente"}


@router.get("/mis-citas")
def my_appointments(current_user: dict = Depends(get_current_user)):
    """Retorna las solicitudes de teleconsulta del paciente autenticado."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM citas WHERE paciente_email = ? ORDER BY creado_en DESC",
            (current_user["email"],),
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/citas")
def list_appointments(medico: dict = Depends(require_medico)):
    """
    Returns all pending appointments (unassigned) plus appointments
    already accepted by this doctor, with patient name and triage info.
    """
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT c.*,
                      u.nombre  AS paciente_nombre,
                      u.cedula  AS paciente_cedula,
                      t.triage_color    AS triage_color,
                      t.symptoms        AS triaje_sintomas,
                      t.timestamp       AS triaje_fecha
               FROM citas c
               LEFT JOIN users          u ON u.email = c.paciente_email
               LEFT JOIN triage_records t ON t.id    = c.triaje_id
               WHERE c.status = 'pendiente' OR c.medico_email = ?
               ORDER BY c.creado_en DESC""",
            (medico["email"],),
        ).fetchall()
    return [dict(r) for r in rows]


class StatusUpdate(BaseModel):
    status: str  # 'confirmada' | 'rechazada'


@router.put("/citas/{cita_id}/status")
def update_appointment_status(
    cita_id: int,
    body: StatusUpdate,
    medico: dict = Depends(require_medico),
):
    """Doctor accepts or rejects a pending appointment."""
    if body.status not in ("confirmada", "rechazada"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="status must be 'confirmada' or 'rechazada'.",
        )
    with get_conn() as conn:
        cita = conn.execute("SELECT * FROM citas WHERE id = ?", (cita_id,)).fetchone()
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    if dict(cita)["status"] != "pendiente":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only pending appointments can be updated.")

    medico_email = medico["email"] if body.status == "confirmada" else None
    with get_conn() as conn:
        conn.execute(
            "UPDATE citas SET status = ?, medico_email = ? WHERE id = ?",
            (body.status, medico_email, cita_id),
        )
    logger.info(f"Cita {cita_id} → {body.status} | médico: {medico['email']}")
    return {"id": cita_id, "status": body.status}


