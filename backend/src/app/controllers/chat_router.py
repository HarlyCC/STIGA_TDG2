import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.gemma_service import GemmaService
from app.services.predictor import Predictor
from app.services.triage_service import get_patient_profile, sync_forward
from app.core.security import get_current_user

logger = logging.getLogger("stiga.chat")

router = APIRouter()

gemma_service = GemmaService(api_key=os.getenv("GOOGLE_API_KEY"))
predictor     = Predictor()


# ── Request models ────────────────────────────────────────────────────────────

class MessageRequest(BaseModel):
    session_id: str
    message:    str


class SyncRequest(BaseModel):
    session_id:    str
    patient_data:  dict
    triage_result: dict


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/chat/start/{session_id}")
def start_conversation(
    session_id:   str,
    current_user: dict = Depends(get_current_user),
):
    prefilled = get_patient_profile(current_user["email"])
    logger.info(f"Iniciando conversación | sesión: {session_id} | paciente: {prefilled['nombre']}")
    return gemma_service.start_conversation(session_id, prefilled_data=prefilled)


@router.post("/chat/message")
def send_message(
    request:      MessageRequest,
    current_user: dict = Depends(get_current_user),
):
    response = gemma_service.chat(request.session_id, request.message)

    if response["ready_for_model"]:
        try:
            triage_result = predictor.predict(response["patient_data"])
            response["triage_result"] = triage_result
            logger.info(f"Triaje completado | sesión: {request.session_id} | usuario: {current_user['email']}")
        except Exception as e:
            logger.error(f"Error en predicción: {e}", exc_info=True)
            response["triage_result"] = None

    return response


@router.get("/triage/result/{session_id}")
def get_triage_result(
    session_id:   str,
    current_user: dict = Depends(get_current_user),
):
    session = gemma_service.sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")
    if not session.is_complete:
        raise HTTPException(status_code=400, detail="La sesión aún no está completa.")

    try:
        result = predictor.predict(session.patient_data)
        return {
            "session_id":    session_id,
            "patient_data":  session.patient_data,
            "triage_result": result,
        }
    except Exception as e:
        logger.error(f"Error obteniendo resultado [{session_id}]: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al calcular el triaje.")


@router.post("/sync/forward")
def sync_forward_endpoint(
    request:      SyncRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        return sync_forward(
            request.session_id,
            current_user["email"],
            request.patient_data,
            request.triage_result,
        )
    except Exception as e:
        logger.error(f"Error en sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al sincronizar el registro.")


@router.delete("/chat/session/{session_id}")
def close_session(
    session_id:   str,
    current_user: dict = Depends(get_current_user),
):
    session = gemma_service.sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")

    logger.info(
        f"Cerrando sesión {session_id} | "
        f"usuario: {current_user['email']} | "
        f"completa: {session.is_complete} | "
        f"turnos: {len(session.history)}"
    )

    gemma_service.close_session(session_id)
    return {"status": "ok", "message": f"Sesión {session_id} cerrada correctamente."}
