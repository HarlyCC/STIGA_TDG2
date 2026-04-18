import pandas as pd
import joblib
import sqlite3
import logging
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, roc_auc_score
from config.paths import DB_PATH, MODELS_DIR

logger = logging.getLogger("stiga.trainer")
MODEL_PATH = MODELS_DIR / "stiga_triage_model.pkl"

# El modelo clasifica únicamente con signos vitales objetivos.
# symptom_severity (asignado por Gemma) actúa como escalador post-predicción
# en el Predictor — no se incluye aquí para no contaminar el aprendizaje
# con una variable subjetiva de distribución diferente en entrenamiento vs producción.
FEATURES = [
    'age', 'gender', 'heart_rate', 'systolic_bp',
    'o2_sat', 'body_temp', 'glucose', 'cholesterol',
]


def train_stiga_model():
    logger.info("Entrenando cerebro de STIGA")
    logger.info(f"Base de datos: {DB_PATH}")

    if not DB_PATH.exists():
        logger.error(f"No se encontró la base de datos en {DB_PATH}")
        return

    try:
        with sqlite3.connect(DB_PATH) as conn:
            df = pd.read_sql_query("SELECT * FROM master_triage", conn)
    except Exception as e:
        logger.error(f"Error al conectar con SQLite: {e}", exc_info=True)
        return

    registros_originales = len(df)
    df = df.dropna(subset=["triage_level"])
    df["triage_level"] = df["triage_level"].astype(int)

    logger.info(f"Registros originales  : {registros_originales}")
    logger.info(f"Registros etiquetados : {len(df)}")
    logger.info(f"Descartados (sin label): {registros_originales - len(df)}")
    logger.info(f"Distribución triage:\n{df['triage_level'].value_counts().sort_index()}")

    X = df[FEATURES]
    y = df["triage_level"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    logger.info(f"Entrenamiento: {len(X_train)} | Test: {len(X_test)}")

    # Pipeline — StandardScaler omitido: Random Forest no requiere escala
    pipeline = Pipeline([
        ("imputer",    SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=200,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    # Validación cruzada estratificada antes del entrenamiento final
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_macro")
    logger.info(
        f"CV F1-macro (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}"
    )

    # Entrenamiento final sobre todo el conjunto de entrenamiento
    pipeline.fit(X_train, y_train)

    # Evaluación en test
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)

    logger.info(f"Reporte de clasificación:\n{classification_report(y_test, y_pred)}")

    auc_score = roc_auc_score(y_test, y_prob, multi_class="ovr")
    logger.info(f"AUC-ROC (OvR): {auc_score:.4f}")

    # Persistencia
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info(f"Modelo guardado en: {MODEL_PATH}")
