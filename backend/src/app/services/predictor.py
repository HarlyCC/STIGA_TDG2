# src/app/services/predictor.py
import joblib
import logging
import numpy as np
import pandas as pd
from config.paths import MODELS_DIR

logger = logging.getLogger("stiga.predictor")

MODEL_PATH = MODELS_DIR / "stiga_triage_model.pkl"

FEATURES = ['age', 'gender', 'heart_rate', 'systolic_bp',
            'o2_sat', 'body_temp', 'glucose', 'cholesterol']

TRIAGE_LABELS = {
    0: {"nivel": 0, "color": "Verde",    "urgencia": "No urgente",         "accion": "Puede esperar consulta regular."},
    1: {"nivel": 1, "color": "Amarillo", "urgencia": "Urgencia moderada",  "accion": "Atención en las próximas 1-2 horas."},
    2: {"nivel": 2, "color": "Naranja",  "urgencia": "Urgencia alta",      "accion": "Atención inmediata requerida."},
    3: {"nivel": 3, "color": "Rojo",     "urgencia": "Emergencia crítica", "accion": "TRASLADO URGENTE. Activar protocolo de emergencias."},
}


class Predictor:
    """
    Responsabilidad: cargar el modelo entrenado y ejecutar inferencia
    a partir de los datos clínicos extraídos por GemmaService.
    """

    def __init__(self):
        self.model = self._load_model()

    def _load_model(self):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Modelo no encontrado en {MODEL_PATH}. "
                "Ejecuta el pipeline de entrenamiento primero."
            )
        model = joblib.load(MODEL_PATH)
        logger.info(f"Modelo cargado desde: {MODEL_PATH}")
        return model

    def predict(self, patient_data: dict) -> dict:
        """
        Ejecuta inferencia para un paciente.
        El Random Forest clasifica con signos vitales.
        El post-procesamiento escala el nivel con symptom_severity de Gemma.
        """
        # Construir DataFrame con el orden exacto de features
        row = {feat: patient_data.get(feat, np.nan) for feat in FEATURES}
        X   = pd.DataFrame([row])

        level = int(self.model.predict(X)[0])
        proba = self.model.predict_proba(X)[0]

        # ── Post-procesamiento con symptom_severity de Gemma ──
        severity       = float(patient_data.get("symptom_severity") or 0)
        original_level = level

        if severity >= 9 and level < 3:
            level = 3
        elif severity >= 8 and level < 2:
            level = 2

        if level != original_level:
            logger.info(
                f"Nivel escalado {original_level}→{level} "
                f"por symptom_severity={severity}"
            )

        result = {
            **TRIAGE_LABELS[level],
            "confianza":       round(float(proba[original_level]), 4),
            "escalado":        level != original_level,
            "probabilidades":  {
                TRIAGE_LABELS[i]["color"]: round(float(p), 4)
                for i, p in enumerate(proba)
            },
            "datos_usados":    {k: v for k, v in row.items() if not pd.isna(v)},
            "datos_imputados": [k for k, v in row.items() if pd.isna(v)],
        }

        logger.info(
            f"Predicción: Nivel {level} ({TRIAGE_LABELS[level]['color']}) "
            f"| Confianza: {result['confianza']:.1%} "
            f"| Escalado: {result['escalado']}"
        )
        return result