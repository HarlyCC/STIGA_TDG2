"""
STIGA — Pipeline de entrenamiento mejorado (TDG2 v2)

Mejoras respecto a v1:
  1. Augmentación de respiratory_rate y pain_scale con distribuciones clínicas
     fundamentadas en criterios SIRS/OMS y escala numérica de dolor.
  2. Comparación de tres modelos: RandomForest, XGBoost, LightGBM.
  3. Calibración de probabilidades (Platt scaling) para que P(Rojo) sea fiable.
  4. SHAP values para explicabilidad clínica por clase.
  5. Reporte completo: classification_report, AUC-ROC, confusion matrix, calibración.
  6. Feature set depurado: se eliminan gender y cholesterol (importancia < 3 %, 73 % nulos).
"""

import logging
import sqlite3
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

from config.paths import DB_PATH, MODELS_DIR

logger = logging.getLogger("stiga.trainer")
MODEL_PATH = MODELS_DIR / "stiga_triage_model.pkl"

# ── Features depuradas ────────────────────────────────────────────────────────
# Eliminados: gender (importancia 0.008, 73 % nulos)
#             cholesterol (importancia 0.028, 73 % nulos)
# Agregados:  respiratory_rate (criterio SIRS), pain_scale (escala numérica dolor)
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

COLORS = {0: "Verde", 1: "Amarillo", 2: "Naranja", 3: "Rojo"}

# ── Distribuciones clínicas para augmentación ────────────────────────────────
#
# respiratory_rate (respiraciones/min) — Criterios SIRS/OMS:
#   Normal adulto:  12-20  (SIRS umbral: > 20)
#   Urgencia leve:  18-25
#   Urgencia alta:  25-35  (sepsis moderada)
#   Emergencia:     > 30   (fallo respiratorio)
#
# pain_scale (0-10, escala numérica del dolor — NRS):
#   Correlacionado con symptom_severity del dataset.
#   Se añade ruido gaussiano (σ=0.8) y se redondea a entero.
#
_RESP_DIST = {
    # (media, std, clip_min, clip_max)
    0: (15.0, 2.0, 10, 20),   # Verde    — respiración normal
    1: (21.0, 3.0, 16, 30),   # Amarillo — taquipnea leve
    2: (27.0, 4.0, 20, 40),   # Naranja  — taquipnea moderada-severa
    3: (33.0, 5.0, 25, 55),   # Rojo     — fallo respiratorio
}

_PAIN_OFFSET = {0: 0.0, 1: 1.5, 2: 3.0, 3: 4.5}   # desplazamiento sobre severity


def _augment(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """
    Añade respiratory_rate y pain_scale a cada fila usando distribuciones
    clínicas condicionadas al nivel de triaje.
    Los valores ya existentes en la BD se respetan (no se sobreescriben).
    """
    rng = np.random.default_rng(seed)
    df  = df.copy()

    for col in ("respiratory_rate", "pain_scale"):
        if col not in df.columns:
            df[col] = np.nan

    for level, (mu, sigma, lo, hi) in _RESP_DIST.items():
        mask = (df["triage_level"] == level) & df["respiratory_rate"].isna()
        n    = mask.sum()
        if n:
            df.loc[mask, "respiratory_rate"] = np.clip(
                rng.normal(mu, sigma, n), lo, hi
            ).round(1)

    for level, offset in _PAIN_OFFSET.items():
        mask = (df["triage_level"] == level) & df["pain_scale"].isna()
        n    = mask.sum()
        if n:
            base   = df.loc[mask, "symptom_severity"].fillna(
                df.loc[df["triage_level"] == level, "symptom_severity"].median()
            )
            noise  = rng.normal(0, 0.8, n)
            values = np.clip((base + offset + noise).values, 0, 10).round(0)
            df.loc[mask, "pain_scale"] = values

    return df


# ── Modelos candidatos ────────────────────────────────────────────────────────

def _build_candidates() -> dict:
    candidates = {
        "RandomForest": RandomForestClassifier(
            n_estimators=300,
            max_depth=None,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=300,
            learning_rate=0.08,
            max_depth=5,
            subsample=0.8,
            random_state=42,
        ),
    }
    if HAS_XGB:
        candidates["XGBoost"] = XGBClassifier(
            n_estimators=300,
            learning_rate=0.08,
            max_depth=6,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="mlogloss",
            random_state=42,
            n_jobs=-1,
        )
    if HAS_LGB:
        candidates["LightGBM"] = LGBMClassifier(
            n_estimators=300,
            learning_rate=0.08,
            max_depth=6,
            subsample=0.8,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
            verbose=-1,
        )
    return candidates


# ── Pipeline ──────────────────────────────────────────────────────────────────

def train_stiga_model():
    logger.info("=" * 60)
    logger.info("STIGA — Entrenamiento v2 (TDG2)")
    logger.info("=" * 60)

    if not DB_PATH.exists():
        logger.error(f"BD no encontrada: {DB_PATH}")
        return

    # 1. Carga y preprocesamiento
    with sqlite3.connect(DB_PATH) as conn:
        df = pd.read_sql_query("SELECT * FROM master_triage", conn)

    df = df.dropna(subset=["triage_level"])
    df["triage_level"] = df["triage_level"].astype(int)

    logger.info(f"Registros originales  : {len(df)}")
    logger.info("Distribución original :")
    for lvl, cnt in df["triage_level"].value_counts().sort_index().items():
        logger.info(f"  Nivel {lvl} ({COLORS[lvl]}): {cnt} ({cnt/len(df)*100:.1f} %)")

    # 2. Augmentación de features clínicas
    df = _augment(df)
    logger.info(f"Augmentación completada | respiratory_rate y pain_scale generados")

    X = df[FEATURES]
    y = df["triage_level"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    logger.info(f"Train: {len(X_train)} | Test: {len(X_test)}")

    imputer = SimpleImputer(strategy="median")

    # 3. Comparación de modelos con CV estratificada
    cv      = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}
    candidates = _build_candidates()

    logger.info("")
    logger.info("── Comparación de modelos (CV 5-fold F1-macro) ──")
    for name, clf in candidates.items():
        pipe = Pipeline([("imp", imputer), ("clf", clf)])
        scores = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="f1_macro", n_jobs=-1)
        results[name] = scores.mean()
        logger.info(f"  {name:<20}: {scores.mean():.4f} ± {scores.std():.4f}")

    best_name = max(results, key=results.get)
    logger.info(f"\nMejor modelo: {best_name} (F1-macro CV = {results[best_name]:.4f})")

    # 4. Entrenamiento final del mejor modelo con calibración
    best_clf  = candidates[best_name]
    base_pipe = Pipeline([("imp", imputer), ("clf", best_clf)])

    # CalibratedClassifierCV (Platt scaling) para probabilidades fiables
    calibrated = CalibratedClassifierCV(base_pipe, cv=5, method="sigmoid")
    calibrated.fit(X_train, y_train)

    y_pred = calibrated.predict(X_test)
    y_prob = calibrated.predict_proba(X_test)

    # 5. Métricas de evaluación
    logger.info("")
    logger.info("── Evaluación en Test ──")
    logger.info(f"\n{classification_report(y_test, y_pred, target_names=list(COLORS.values()))}")

    auc = roc_auc_score(y_test, y_prob, multi_class="ovr")
    logger.info(f"AUC-ROC (OvR): {auc:.4f}")

    logger.info("\nMatriz de confusión:")
    cm     = confusion_matrix(y_test, y_pred)
    header = "           " + "  ".join(f"{COLORS[i]:>9}" for i in range(4))
    logger.info(header)
    for i, row in enumerate(cm):
        logger.info(f"  {COLORS[i]:>9}" + "  ".join(f"{v:>9}" for v in row))

    # Recall por clase (crítico para seguridad clínica)
    logger.info("\nRecall por clase (falsos negativos = riesgo clínico):")
    for i in range(4):
        tp  = cm[i, i]
        tot = cm[i].sum()
        logger.info(f"  {COLORS[i]:>9}: {tp/tot:.1%} ({tp}/{tot})")

    # 6. Feature importance (del clasificador interno, si aplica)
    try:
        inner_clf = calibrated.calibrated_classifiers_[0].estimator.named_steps["clf"]
        if hasattr(inner_clf, "feature_importances_"):
            fi = inner_clf.feature_importances_
            logger.info("\nFeature importance (modelo interno):")
            for feat, imp in sorted(zip(FEATURES, fi), key=lambda x: -x[1]):
                bar = "#" * int(imp * 40)
                logger.info(f"  {feat:<22}: {imp:.4f}  {bar}")
    except Exception:
        pass

    # 7. SHAP (si disponible)
    try:
        import shap
        logger.info("\nCalculando SHAP values...")
        X_shap = imputer.fit_transform(X_test.iloc[:500])
        X_shap = pd.DataFrame(X_shap, columns=FEATURES)

        inner_clf = calibrated.calibrated_classifiers_[0].estimator.named_steps["clf"]
        explainer  = shap.TreeExplainer(inner_clf)
        shap_vals  = explainer.shap_values(X_shap)

        # Normalise to ndarray shape (n_classes, n_samples, n_features)
        if isinstance(shap_vals, list):
            shap_arr = np.stack(shap_vals, axis=0)          # old SHAP: list of 2D arrays
        elif isinstance(shap_vals, np.ndarray) and shap_vals.ndim == 3:
            shap_arr = shap_vals                             # new SHAP: (n_samples, n_features, n_classes)
            shap_arr = np.moveaxis(shap_arr, -1, 0)         # → (n_classes, n_samples, n_features)
        else:
            shap_arr = shap_vals[np.newaxis, ...]            # binary / fallback

        mean_abs = np.abs(shap_arr).mean(axis=(0, 1))       # average over classes and samples

        logger.info("SHAP mean |value| por feature:")
        for feat, val in sorted(zip(FEATURES, mean_abs), key=lambda x: -x[1]):
            logger.info(f"  {feat:<22}: {val:.4f}")

        shap_path = MODELS_DIR / "shap_values.npz"
        np.savez(shap_path, shap_values=shap_arr, feature_names=np.array(FEATURES))
        logger.info(f"SHAP guardados en: {shap_path}")

    except Exception as e:
        logger.warning(f"SHAP no disponible: {e}")

    # 8. Persistencia
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrated, MODEL_PATH)
    logger.info(f"\nModelo guardado: {MODEL_PATH}")
    logger.info(f"Modelo: {best_name} + CalibratedClassifierCV (Platt)")
    logger.info(f"Features: {FEATURES}")
    logger.info(f"AUC-ROC: {auc:.4f}")

    return {"modelo": best_name, "auc_roc": auc, "features": FEATURES}
