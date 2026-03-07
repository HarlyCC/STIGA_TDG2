import logging
import json
import time
from google import genai
from google.genai import types
from app.data.data_cleaner import DataCleaner

logger = logging.getLogger("stiga.gemma_service")

GEMMA_MODEL = "gemma-3-12b-it"

SYSTEM_PROMPT = """Eres STIGA, un asistente médico de triaje para zonas rurales de Ecuador.
Tu rol es recopilar información clínica del paciente de forma conversacional, empática y en español simple.

REGLAS ESTRICTAS:
1. Haz UNA sola pregunta a la vez, nunca varias juntas.
2. Usa lenguaje simple, nunca términos médicos complejos.
3. Si el usuario no sabe un dato, acepta la respuesta y continúa.
4. Cuando tengas suficiente información, responde ÚNICAMENTE con un JSON con este formato exacto:

{
  "status": "complete",
  "data": {
    "age": null,
    "gender": null,
    "heart_rate": null,
    "systolic_bp": null,
    "o2_sat": null,
    "body_temp": null,
    "glucose": null,
    "cholesterol": null,
    "symptoms": null
  }
}

5. Mientras recopilas datos, responde ÚNICAMENTE con:
{
  "status": "collecting",
  "message": "tu pregunta o respuesta aquí"
}

6. Los valores que no se pudieron obtener deben ser null.
7. gender: 0=Femenino, 1=Masculino, 2=Desconocido.
8. Los valores numéricos deben ser estrictamente números (ej: 36.5, no '36.5 grados').
   Si el usuario dice '75 años', guarda solo 75. Si dice '38 grados', guarda solo 38.
9. Nunca inventes ni asumas valores clínicos.
"""

VITAL_RANGES = {
    "age":         (0,   120),
    "heart_rate":  (30,  250),
    "systolic_bp": (50,  300),
    "o2_sat":      (50,  100),
    "body_temp":   (34,  44),
    "glucose":     (20,  600),
    "cholesterol": (50,  700),
}

MINIMUM_FEATURES = ["age", "symptoms"]
MAX_RETRIES      = 3


class ConversationSession:
    def __init__(self, session_id: str):
        self.session_id   = session_id
        self.history      = []
        self.patient_data = {}
        self.is_complete  = False

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})

    def get_history_for_api(self) -> list:
        # Gemma no soporta system_instruction
        # Se inyecta el prompt como primer turno del historial
        system_turn = [
            {
                "role": "user",
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            {
                "role": "model",
                "parts": [{"text": "Entendido. Seguiré todas las instrucciones al pie de la letra."}]
            }
        ]
        return system_turn + [
            {"role": msg["role"], "parts": [{"text": msg["content"]}]}
            for msg in self.history
        ]


class GemmaService:
    """
    Responsabilidad: gestionar la conversación con Gemma 3
    para extraer datos clínicos estructurados por paciente.
    """

    def __init__(self, api_key: str):
        self.client   = genai.Client(api_key=api_key)
        self.sessions: dict[str, ConversationSession] = {}
        self.cleaner  = DataCleaner()
        logger.info("GemmaService inicializado | modelo: %s", GEMMA_MODEL)

    # ── Gestión de sesiones ──────────────────

    def get_or_create_session(self, session_id: str) -> ConversationSession:
        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationSession(session_id)
            logger.info(f"Nueva sesión creada: {session_id}")
        return self.sessions[session_id]

    def close_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Sesión cerrada: {session_id}")

    # ── Conversación ─────────────────────────

    def start_conversation(self, session_id: str) -> dict:
        opening = (
            "Hola, soy STIGA, su asistente de salud. "
            "Voy a hacerle algunas preguntas para evaluar su estado. "
            "¿Cuál es su nombre y cuántos años tiene?"
        )
        session = self.get_or_create_session(session_id)
        session.add_message("model", opening)
        return self._build_response("collecting", opening, session)

    def chat(self, session_id: str, user_message: str) -> dict:
        """
        Procesa un mensaje del usuario y retorna la respuesta de Gemma.

        Returns dict con:
            status          : "collecting" | "complete" | "error"
            message         : pregunta o respuesta de Gemma
            patient_data    : datos clínicos recopilados hasta ahora
            ready_for_model : True cuando puede predecir
        """
        session = self.get_or_create_session(session_id)

        if session.is_complete:
            return self._build_response("complete", "La sesión ya fue completada.", session)

        session.add_message("user", user_message)

        for attempt in range(MAX_RETRIES):
            try:
                response = self.client.models.generate_content(
                    model=GEMMA_MODEL,
                    contents=session.get_history_for_api(),
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=512,
                    )
                )
                raw = response.text.strip()
                session.add_message("model", raw)
                return self._parse_response(session, raw)

            except Exception as e:
                is_503 = "503" in str(e)
                is_last = attempt == MAX_RETRIES - 1

                if is_503 and not is_last:
                    wait = (attempt + 1) * 10  # 10s → 20s → 30s
                    logger.warning(
                        f"Servidor ocupado [{session_id}] | "
                        f"intento {attempt + 1}/{MAX_RETRIES} | "
                        f"reintentando en {wait}s..."
                    )
                    time.sleep(wait)
                else:
                    logger.error(f"Error Gemma [{session_id}]: {e}", exc_info=True)
                    return self._build_response(
                        "error",
                        "Lo siento, hubo un problema. ¿Puede repetir su respuesta?",
                        session
                    )

    # ── Parseo ───────────────────────────────

    def _parse_response(self, session: ConversationSession, raw: str) -> dict:
        try:
            clean  = raw.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean)

            if parsed.get("status") == "complete":
                data = self._sanitize_data(parsed.get("data", {}))
                data = self._validate_vitals(data)
                session.patient_data = data
                session.is_complete  = True
                logger.info(f"Sesión {session.session_id} completada | {data}")
                return self._build_response(
                    "complete",
                    "Gracias, ya tengo toda la información necesaria.",
                    session
                )

            return self._build_response(
                "collecting",
                parsed.get("message", raw),
                session
            )

        except json.JSONDecodeError:
            logger.warning(f"Respuesta no JSON de Gemma, guardando como síntoma: {raw[:80]}")
            if not session.patient_data.get("symptoms"):
                session.patient_data["symptoms"] = raw
            return self._build_response("collecting", raw, session)

    # ── Validaciones ─────────────────────────

    def _sanitize_data(self, data: dict) -> dict:
        sanitized = {}
        for key, val in data.items():
            if val is None or val == "null":
                sanitized[key] = None
            elif key == "symptoms":
                sanitized[key] = str(val) if val else None
            elif key == "gender":
                sanitized[key] = self.cleaner.clean_gender(val)
            else:
                sanitized[key] = self.cleaner.clean_numeric(val)
        return sanitized

    def _validate_vitals(self, data: dict) -> dict:
        validated = dict(data)
        for field, (min_val, max_val) in VITAL_RANGES.items():
            if validated.get(field) is not None:
                result = self.cleaner.validate_vitals(validated[field], min_val, max_val)
                if result is None:
                    logger.warning(
                        f"Valor fisiológicamente inválido descartado | "
                        f"{field}: {validated[field]} (rango: {min_val}-{max_val})"
                    )
                validated[field] = result
        return validated

    # ── Utilidades ───────────────────────────

    def _build_response(self, status: str, message: str, session: ConversationSession) -> dict:
        return {
            "status":          status,
            "message":         message,
            "patient_data":    session.patient_data,
            "ready_for_model": status == "complete" and self._has_minimum_data(session.patient_data),
        }

    def _has_minimum_data(self, data: dict) -> bool:
        return all(data.get(f) is not None for f in MINIMUM_FEATURES)