import logging
import json
import time
from datetime import date
from google import genai
from google.genai import types
from app.data.data_cleaner import DataCleaner

logger = logging.getLogger("stiga.gemma_service")

GEMMA_MODEL = "gemma-3-12b-it"

# Las llaves del JSON dentro del prompt deben estar escapadas ({{ }})
# para que .format() no las interprete como variables.
SYSTEM_PROMPT_BASE = """\
Eres STIGA, un asistente médico de triaje para zonas rurales de Colombia.
Tu rol es recopilar información clínica y logística del paciente de forma conversacional, empática y en español simple.

DATOS PERSONALES YA REGISTRADOS (NO volver a preguntar por estos):
{personal_data_summary}

ORDEN DE RECOPILACIÓN:
1. Primero pregunta qué síntomas tiene hoy.
2. Luego recoge los signos vitales disponibles: frecuencia cardíaca, presión arterial sistólica,
   saturación de oxígeno, temperatura corporal, glucosa y colesterol.
   Si el paciente no dispone de algún aparato, acepta y continúa.
3. Finalmente recoge los datos logísticos: si tiene transporte propio y si necesita ambulancia.

REGLAS ESTRICTAS:
1. Haz UNA sola pregunta a la vez, nunca varias juntas.
2. Usa lenguaje simple, nunca términos médicos complejos.
3. Si el usuario no sabe un dato, acepta la respuesta y continúa.
4. NUNCA vuelvas a preguntar por información que el paciente ya haya proporcionado anteriormente en la conversación.
   Si los síntomas ya fueron mencionados, no los preguntes de nuevo; pasa al siguiente dato pendiente.
5. Cuando hayas completado los tres pasos del ORDEN DE RECOPILACIÓN (síntomas, signos vitales
   disponibles Y datos logísticos de transporte), responde ÚNICAMENTE con un JSON con este
   formato exacto — incluye los datos personales ya registrados:

{{
  "status": "complete",
  "data": {{
    "nombre": null,
    "cedula": null,
    "telefono": null,
    "direccion": null,
    "eps": null,
    "age": null,
    "gender": null,
    "heart_rate": null,
    "systolic_bp": null,
    "o2_sat": null,
    "body_temp": null,
    "glucose": null,
    "cholesterol": null,
    "symptoms": null,
    "symptom_severity": null,
    "ciudad": null,
    "tiene_transporte": null,
    "necesita_ambulancia": null
  }}
}}

5. Mientras recopilas datos, responde ÚNICAMENTE con:
{{
  "status": "collecting",
  "message": "tu pregunta o respuesta aquí"
}}

7. Los valores que no se pudieron obtener deben ser null.
8. gender: 0=Femenino, 1=Masculino, 2=Desconocido.
9. Los valores numéricos deben ser estrictamente números (ej: 36.5, no '36.5 grados').
10. symptom_severity: evalúa del 1 al 10 la gravedad de los síntomas descritos.
    1=muy leve, 5=moderado, 10=crítico. Basate en lo que el paciente describe.
11. tiene_transporte: true si tiene vehículo propio, false si no tiene.
12. necesita_ambulancia: true si no tiene transporte Y los síntomas son graves, false en caso contrario.
13. Nunca inventes ni asumas valores clínicos.
"""

GENDER_LABELS = {0: "Femenino", 1: "Masculino", 2: "Desconocido"}

VITAL_RANGES = {
    "age":              (0,   120),
    "heart_rate":       (30,  250),
    "systolic_bp":      (50,  300),
    "o2_sat":           (50,  100),
    "body_temp":        (34,  44),
    "glucose":          (20,  600),
    "cholesterol":      (50,  700),
    "symptom_severity": (1,   10),
}

MINIMUM_FEATURES = ["age", "symptoms"]
MAX_RETRIES      = 3

# Campos que llegan del formulario y no debe preguntar Gemma
PERSONAL_FIELDS = {"nombre", "cedula", "telefono", "direccion", "eps", "ciudad", "age", "gender"}


def _calculate_age(fecha_nacimiento: str) -> int:
    """
    Calcula la edad en años a partir de una fecha 'YYYY-MM-DD'.
    El formato ya fue validado por Pydantic en el controlador,
    por lo que cualquier excepción aquí es un error inesperado.
    """
    born  = date.fromisoformat(fecha_nacimiento)
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _build_personal_summary(prefilled: dict) -> str:
    """Genera el bloque de texto que le indica a Gemma qué datos ya están disponibles."""
    label_map = {
        "nombre":    "Nombre",
        "cedula":    "Cédula",
        "telefono":  "Teléfono",
        "direccion": "Dirección",
        "eps":       "EPS",
        "ciudad":    "Ciudad",
        "age":       "Edad",
        "gender":    "Sexo",
    }
    lines = []
    for field, label in label_map.items():
        val = prefilled.get(field)
        if val is not None:
            display = GENDER_LABELS.get(val, val) if field == "gender" else val
            display = f"{display} años" if field == "age" else display
            lines.append(f"- {label}: {display}")

    if not lines:
        return "Ninguno. Debes recopilar también los datos personales básicos."
    return "\n".join(lines)


class ConversationSession:
    def __init__(self, session_id: str, system_prompt: str):
        self.session_id    = session_id
        self.system_prompt = system_prompt
        self.history       = []
        self.patient_data  = {}
        self.is_complete   = False

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})

    def get_history_for_api(self) -> list:
        system_turn = [
            {
                "role": "user",
                "parts": [{"text": self.system_prompt}]
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
    para extraer datos clínicos y logísticos por paciente.
    Los datos personales se reciben precargados desde el formulario de registro.
    """

    def __init__(self, api_key: str):
        self.client   = genai.Client(api_key=api_key)
        self.sessions: dict[str, ConversationSession] = {}
        self.cleaner  = DataCleaner()
        logger.info("GemmaService inicializado | modelo: %s", GEMMA_MODEL)

    # ── Gestión de sesiones ──────────────────

    def _create_session(self, session_id: str, system_prompt: str) -> ConversationSession:
        session = ConversationSession(session_id, system_prompt)
        self.sessions[session_id] = session
        logger.info(f"Nueva sesión creada: {session_id}")
        return session

    def get_or_create_session(self, session_id: str) -> ConversationSession:
        if session_id not in self.sessions:
            fallback_prompt = SYSTEM_PROMPT_BASE.format(
                personal_data_summary="Ninguno. Debes recopilar también los datos personales básicos."
            )
            return self._create_session(session_id, fallback_prompt)
        return self.sessions[session_id]

    def close_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"Sesión cerrada: {session_id}")

    # ── Conversación ─────────────────────────

    def start_conversation(self, session_id: str, prefilled_data: dict | None = None) -> dict:
        """
        Inicia la sesión de triaje.

        prefilled_data puede incluir:
          nombre, cedula, telefono, direccion, eps, ciudad, gender (int)
          y fecha_nacimiento (str 'YYYY-MM-DD') — de la que se calcula age.

        Con datos precargados, Gemma omite las preguntas personales e inicia
        directamente con síntomas.
        """
        prefilled = dict(prefilled_data or {})

        # Calcular age desde fecha_nacimiento si se proporcionó
        if "fecha_nacimiento" in prefilled:
            age = _calculate_age(prefilled.pop("fecha_nacimiento"))
            if age is not None:
                prefilled["age"] = age

        summary = _build_personal_summary(prefilled)
        prompt  = SYSTEM_PROMPT_BASE.format(personal_data_summary=summary)
        session = self._create_session(session_id, prompt)

        # Inyectar datos personales directamente en patient_data
        for field in PERSONAL_FIELDS:
            if prefilled.get(field) is not None:
                session.patient_data[field] = prefilled[field]

        if prefilled:
            nombre  = prefilled.get("nombre", "")
            opening = (
                f"Hola{', ' + nombre if nombre else ''}. Soy STIGA, su asistente de salud. "
                "Ya tengo registrados sus datos personales. "
                "Cuénteme: ¿qué síntomas o molestias tiene hoy?"
            )
        else:
            opening = (
                "Hola, soy STIGA, su asistente de salud. "
                "Voy a hacerle algunas preguntas para atenderle mejor. "
                "¿Podría decirme su nombre completo?"
            )

        session.add_message("model", opening)
        return self._build_response("collecting", opening, session)

    def chat(self, session_id: str, user_message: str) -> dict:
        """
        Procesa un mensaje del usuario y retorna la respuesta de Gemma.

        Returns dict con:
            status          : "collecting" | "complete" | "error"
            message         : pregunta o respuesta de Gemma
            patient_data    : datos recopilados hasta ahora
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
                    wait = (attempt + 1) * 10
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
                gemma_data = self._sanitize_data(parsed.get("data", {}))
                gemma_data = self._validate_vitals(gemma_data)
                # Los datos personales precargados tienen prioridad sobre lo que Gemma devuelva
                merged = {**gemma_data, **{
                    k: v for k, v in session.patient_data.items()
                    if k in PERSONAL_FIELDS and v is not None
                }}
                session.patient_data = merged
                session.is_complete  = True
                logger.info(f"Sesión {session.session_id} completada | {merged}")
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
            logger.warning(f"Respuesta no JSON de Gemma: {raw[:80]}")
            if not session.patient_data.get("symptoms"):
                session.patient_data["symptoms"] = raw
            return self._build_response("collecting", raw, session)

    # ── Validaciones ─────────────────────────

    def _sanitize_data(self, data: dict) -> dict:
        text_fields    = {"nombre", "cedula", "telefono", "direccion",
                          "eps", "symptoms", "ciudad"}
        boolean_fields = {"tiene_transporte", "necesita_ambulancia"}

        sanitized = {}
        for key, val in data.items():
            if val is None or val == "null":
                sanitized[key] = None
            elif key in text_fields:
                sanitized[key] = str(val).strip() if val else None
            elif key in boolean_fields:
                if isinstance(val, bool):
                    sanitized[key] = val
                else:
                    sanitized[key] = str(val).lower() in ("true", "sí", "si", "1")
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
                        f"Valor inválido descartado | "
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
