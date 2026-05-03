# src/app/services/predictor.py
import joblib
import logging
import warnings
import numpy as np
import pandas as pd
from config.paths import MODELS_DIR

# CalibratedClassifierCV passes numpy arrays to LightGBM internally; suppress the
# sklearn feature-name mismatch warning that arises from that interaction.
warnings.filterwarnings(
    "ignore",
    message="X does not have valid feature names",
    category=UserWarning,
)

logger = logging.getLogger("stiga.predictor")

MODEL_PATH = MODELS_DIR / "stiga_triage_model.pkl"

FEATURES = [
    "age",
    "heart_rate",
    "systolic_bp",
    "o2_sat",
    "body_temp",
    "glucose",
    "respiratory_rate",
    "pain_scale",
    "symptom_severity",
]

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

    # Vitales con señal clínica real en el dataset (no tienen 73% de nulos)
    _CORE_FEATURES = {"heart_rate", "systolic_bp", "o2_sat", "body_temp"}
    _MIN_CORE_VITALS = 2   # mínimo de vitales core presentes para confiar en el RF

    def predict(self, patient_data: dict) -> dict:
        """
        Ejecuta inferencia para un paciente.
        El Random Forest clasifica con signos vitales.
        El post-procesamiento escala el nivel con:
          1. symptom_severity (Gemma, 1-10)
          2. respiratory_rate (fisiológico, estándares OMS/sepsis)
          3. pain_scale (dolor, escala 0-10)
        """
        # ── Construir input del RF ──
        raw_row         = {feat: patient_data.get(feat) for feat in FEATURES}
        row             = {k: (v if v is not None else np.nan) for k, v in raw_row.items()}
        X               = pd.DataFrame([row])
        features_reales = sum(1 for v in row.values() if not pd.isna(v))
        calidad_datos   = round(features_reales / len(FEATURES), 4)

        core_presentes = sum(
            1 for f in self._CORE_FEATURES
            if not pd.isna(row.get(f, np.nan))
        )
        confianza_baja = core_presentes < self._MIN_CORE_VITALS

        level = int(self.model.predict(X)[0])
        proba = self.model.predict_proba(X)[0]

        # ── Post-procesamiento clínico ──
        severity  = float(patient_data.get("symptom_severity") or 0)
        resp_rate = float(patient_data.get("respiratory_rate") or 0)
        pain      = float(patient_data.get("pain_scale") or 0)

        original_level = level
        escalado       = False
        razones_escalo = []

        # 1. Frecuencia respiratoria (criterios OMS/SIRS)
        if resp_rate > 0:
            if resp_rate > 30 or resp_rate < 8:
                if level < 3:
                    level = 3; escalado = True
                    razones_escalo = razones_escalo + ["resp_rate->critico"]
            elif resp_rate > 24:
                if level < 2:
                    level = 2; escalado = True
                    razones_escalo = razones_escalo + [f"resp_rate={resp_rate:.0f}->elevado"]

        # 2. Symptom severity (escala Gemma calibrada con datos de entrenamiento)
        if severity >= 9 and level < 3:
            level = 3; escalado = True
            razones_escalo = razones_escalo + [f"severity={severity}->critico"]
        elif severity >= 7 and level < 2:
            level = 2; escalado = True
            razones_escalo = razones_escalo + [f"severity={severity}->grave"]

        # 3. Dolor severo (refuerzo, no eleva a Rojo solo por dolor)
        if pain >= 9 and level < 2:
            level = 2; escalado = True
            razones_escalo = razones_escalo + [f"pain={pain}->severo"]

        if escalado:
            logger.info(
                f"Nivel escalado {original_level}->{level} | razones: {razones_escalo}"
            )

        if confianza_baja:
            logger.warning(
                f"Predicción con baja calidad de datos | "
                f"vitales core presentes: {core_presentes}/{len(self._CORE_FEATURES)}"
            )

        # ── Confianza ──
        confianza_rf = round(float(proba[original_level]), 4)

        result = {
            **TRIAGE_LABELS[level],
            "confianza":        confianza_rf,
            "confianza_fuente": "modelo" if not escalado else "escalado_clinico",
            "confianza_baja":   confianza_baja,
            "escalado":         escalado,
            "razones_escalado": razones_escalo if escalado else [],
            "calidad_datos":    calidad_datos,
            "features_reales":  features_reales,
            "probabilidades":   {
                TRIAGE_LABELS[i]["color"]: round(float(p), 4)
                for i, p in enumerate(proba)
            },
            "datos_usados":    {k: v for k, v in row.items() if not pd.isna(v)},
            "datos_imputados": [k for k, v in row.items() if pd.isna(v)],
        }

        logger.info(
            f"Predicción: Nivel {level} ({TRIAGE_LABELS[level]['color']}) "
            f"| Confianza RF: {confianza_rf:.1%} "
            f"| Confianza baja: {confianza_baja} "
            f"| Escalado: {escalado} "
            f"| Calidad: {calidad_datos:.0%} ({features_reales}/{len(FEATURES)} features)"
        )
        return result