import pandas as pd
import joblib
import sqlite3
import logging
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, roc_auc_score
from config.paths import DB_PATH, MODELS_DIR

logger = logging.getLogger("stiga.trainer")
MODEL_PATH = MODELS_DIR / "stiga_triage_model.pkl"


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
        logger.error(f"Error al |conectar con SQLite: {e}", exc_info=True)
        return
    
    registros_originales = len(df)
    df = df.dropna(subset=["triage_level"])
    df["triage_level"] = df["triage_level"].astype(int)
    logger.info(f"Registros originales : {registros_originales}")
    logger.info(f"Registros tras limpieza: {len(df)}")
    logger.info(f"Descartados: {registros_originales - len(df)}")
    logger.info(f"Distribución triage:\n{df['triage_level'].value_counts().sort_index()}")

    # Selección de características
    features = ['age', 'gender', 'heart_rate', 'systolic_bp', 'o2_sat',
                'body_temp', 'glucose', 'cholesterol']

    X = df[features]
    y = df['triage_level']

    # División de datos (stratify vital por desbalance del 1.8% de Nivel 3)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    logger.info(f"Entrenamiento: {len(X_train)} registros | Test: {len(X_test)} registros")

    # Pipeline de machine learning
    pipeline = Pipeline([
        ('imputer',    SimpleImputer(strategy='median')),
        ('scaler',     StandardScaler()),
        ('classifier', RandomForestClassifier(
            n_estimators=200,
            class_weight='balanced',  # Clave para detectar Nivel 3 crítico
            random_state=42
        ))
    ])

    # Entrenamiento
    logger.info("Iniciando entrenamiento...")
    pipeline.fit(X_train, y_train)

    # Evaluación
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)

    logger.info(f"Reporte de Rendimiento:\n{classification_report(y_test, y_pred)}")

    auc_score = roc_auc_score(y_test, y_prob, multi_class='ovr')
    logger.info(f"AUC-ROC Final: {auc_score:.4f}")

    # Persistencia del modelo
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info(f"Modelo guardado en: {MODEL_PATH}")
