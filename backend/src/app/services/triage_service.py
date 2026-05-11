import logging
from datetime import datetime, timezone

from fastapi import HTTPException

from app.repositories import user_repository, triage_repository
from app.services import email_service

logger = logging.getLogger("stiga.triage_service")


def get_patient_profile(email: str) -> dict:
    user = user_repository.get_patient_data(email)
    if not user:
        raise HTTPException(status_code=404, detail="Perfil de usuario no encontrado.")
    return dict(user)


def sync_forward(session_id: str, user_email: str,
                 patient_data: dict, triage_result: dict) -> dict:
    triage_color      = triage_result.get("color")
    paciente_nombre   = patient_data.get("nombre")
    paciente_telefono = patient_data.get("telefono")
    paciente_direccion = patient_data.get("direccion")
    ciudad            = patient_data.get("ciudad")
    timestamp         = datetime.now(timezone.utc).isoformat()

    triaje_id = triage_repository.insert_triage(
        session_id, timestamp, user_email, patient_data, triage_result
    )

    if triage_color in ("Naranja", "Rojo"):
        triage_repository.insert_alerta(
            triaje_id, user_email, paciente_nombre, paciente_telefono,
            ciudad, triage_color, timestamp,
        )
        logger.warning(
            f"Alerta crítica | triaje_id: {triaje_id} | color: {triage_color} | paciente: {user_email}"
        )
        try:
            email_service.send_critical_triage_alert(
                paciente_nombre=paciente_nombre,
                paciente_email=user_email,
                paciente_telefono=paciente_telefono,
                paciente_direccion=paciente_direccion,
                ciudad=ciudad,
                triage_color=triage_color,
            )
        except Exception as email_err:
            logger.error(f"No se pudo enviar email de alerta crítica: {email_err}")

    logger.info(f"Registro sincronizado | sesión: {session_id} | usuario: {user_email}")
    return {"status": "ok", "message": "Registro guardado correctamente."}
