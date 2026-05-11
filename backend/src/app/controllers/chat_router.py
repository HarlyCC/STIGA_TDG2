import json
import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.services.gemma_service import GemmaService, ConversationSession
from app.services.predictor import Predictor
from app.services.triage_service import get_patient_profile, sync_forward
from app.core.security import get_current_user
from app.repositories import chat_session_repository

logger = logging.getLogger("stiga.chat")

router = APIRouter()

gemma_service = GemmaService(api_key=os.getenv("GOOGLE_API_KEY"))
predictor     = Predictor()


# Modelos de solicitud

class MessageRequest(BaseModel):
    session_id: str
    message:    str


class SyncRequest(BaseModel):
    session_id:    str
    patient_data:  dict
    triage_result: dict


# Endpoints

@router.post("/chat/start/{session_id}")
def start_conversation(
    session_id:   str,
    current_user: dict = Depends(get_current_user),
):
    prefilled = get_patient_profile(current_user["email"])
    logger.info(f"Iniciando conversación | sesión: {session_id} | paciente: {prefilled['nombre']}")
    return gemma_service.start_conversation(
        session_id, prefilled_data=prefilled, user_email=current_user["email"]
    )


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


@router.get("/chat/session/active")
def get_active_session(current_user: dict = Depends(get_current_user)):
    row = chat_session_repository.find_active_by_user(current_user["email"])
    if not row:
        return None

    session_id = row["session_id"]

    try:
        history      = json.loads(row["history_json"])
        patient_data = json.loads(row["patient_data_json"])
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"Sesión {session_id} con JSON corrupto en BD: {e}")
        chat_session_repository.delete(session_id)
        return None

    # Reconstruir mensajes para la UI (excluye JSON internos de Gemma)
    ui_messages = []
    for i, msg in enumerate(history):
        content = msg.get("content", "")
        try:
            parsed = json.loads(content)
            text = parsed.get("message", content)
        except (json.JSONDecodeError, TypeError):
            text = content
        ui_messages.append({
            "id":   i,
            "from": "stiga" if msg.get("role") == "model" else "user",
            "text": text,
        })

    # Cargar en memoria si el servidor fue reiniciado
    if session_id not in gemma_service.sessions:
        session               = ConversationSession(session_id, row["system_prompt"], current_user["email"])
        session.history       = history
        session.patient_data  = patient_data
        session.is_complete   = bool(row["is_complete"])
        gemma_service.sessions[session_id] = session
        logger.info(f"Sesión {session_id} restaurada desde BD")

    return {"session_id": session_id, "messages": ui_messages}


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
