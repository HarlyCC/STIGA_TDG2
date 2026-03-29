import logging
import sqlite3
import os
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.gemma_service import GemmaService
from app.services.predictor import Predictor
from config.paths import DB_PATH

load_dotenv()

logger = logging.getLogger("stiga.triage_controller")

app = FastAPI(
    title="STIGA API",
    description="Sistema de Triaje Inteligente Guiado por IA",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

gemma_service = GemmaService(api_key=os.getenv("GOOGLE_API_KEY"))
predictor = Predictor()

class MessageRequest(BaseModel):
    session_id: str
    message: str

class SyncRequest(BaseModel):
    session_id: str
    patient_data:  dict
    triage_result: dict


@app.post("/chat/start/{session_id}")
def start_conversation(session_id: str):
    """Inicia una nueva sesión de triaje conversacional."""
    logger.info(f"Iniciando conversación | sesión: {session_id}")
    return gemma_service.start_conversation(session_id)


@app.post("/chat/message")
def send_message(request: MessageRequest):
    """Envía un mensaje del usuario y recibe respuesta de Gemma."""
    response = gemma_service.chat(request.session_id, request.message)

    if response["ready_for_model"]:
        try:
            triage_result = predictor.predict(response["patient_data"])
            response["triage_result"] = triage_result
            logger.info(f"Triaje completado | sesión: {request.session_id}")
        except Exception as e:
            logger.error(f"Error en predicción: {e}", exc_info=True)
            response["triage_result"] = None

    return response


@app.get("/triage/result/{session_id}")
def get_triage_result(session_id: str):
    """Obtiene el resultado del triaje para una sesión completada."""
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


@app.post("/sync/forward")
def sync_forward(request: SyncRequest):
    """Store & Forward — persiste el registro en SQLite central."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS triage_records (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id          TEXT,
                    timestamp           TEXT,
                    nombre              TEXT,
                    cedula              TEXT,
                    telefono            TEXT,
                    direccion           TEXT,
                    eps                 TEXT,
                    age                 REAL,
                    gender              REAL,
                    heart_rate          REAL,
                    systolic_bp         REAL,
                    o2_sat              REAL,
                    body_temp           REAL,
                    glucose             REAL,
                    cholesterol         REAL,
                    symptoms            TEXT,
                    symptom_severity    REAL,
                    ciudad              TEXT,
                    tiene_transporte    INTEGER,
                    necesita_ambulancia INTEGER,
                    triage_level        INTEGER,
                    triage_color        TEXT,
                    confianza           REAL,
                    escalado            INTEGER
                )
            """)
            conn.execute("""
                INSERT INTO triage_records (
                    session_id, timestamp,
                    nombre, cedula, telefono, direccion, eps,
                    age, gender, heart_rate, systolic_bp,
                    o2_sat, body_temp, glucose, cholesterol,
                    symptoms, symptom_severity,
                    ciudad, tiene_transporte, necesita_ambulancia,
                    triage_level, triage_color, confianza, escalado
                ) VALUES (
                    ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?
                )
            """, (
                request.session_id,
                datetime.now().isoformat(),
                request.patient_data.get("nombre"),
                request.patient_data.get("cedula"),
                request.patient_data.get("telefono"),
                request.patient_data.get("direccion"),
                request.patient_data.get("eps"),
                request.patient_data.get("age"),
                request.patient_data.get("gender"),
                request.patient_data.get("heart_rate"),
                request.patient_data.get("systolic_bp"),
                request.patient_data.get("o2_sat"),
                request.patient_data.get("body_temp"),
                request.patient_data.get("glucose"),
                request.patient_data.get("cholesterol"),
                request.patient_data.get("symptoms"),
                request.patient_data.get("symptom_severity"),
                request.patient_data.get("ciudad"),
                int(request.patient_data.get("tiene_transporte") or 0),
                int(request.patient_data.get("necesita_ambulancia") or 0),
                request.triage_result.get("nivel"),
                request.triage_result.get("color"),
                request.triage_result.get("confianza"),
                int(request.triage_result.get("escalado") or 0),
            ))

        logger.info(f"Registro sincronizado | sesión: {request.session_id}")
        return {"status": "ok", "message": "Registro guardado correctamente."}

    except Exception as e:
        logger.error(f"Error en sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error al sincronizar el registro.")


@app.delete("/chat/session/{session_id}")
def close_session(session_id: str):
    """Cierra la sesión, libera memoria y guarda log final."""
    session = gemma_service.sessions.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")

    logger.info(
        f"Cerrando sesión {session_id} | "
        f"Completa: {session.is_complete} | "
        f"Turnos: {len(session.history)} | "
        f"Datos: {session.patient_data}"
    )

    gemma_service.close_session(session_id)
    return {"status": "ok", "message": f"Sesión {session_id} cerrada correctamente."}