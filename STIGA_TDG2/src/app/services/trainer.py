import sqlite3
import pandas as pd
import joblib

from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, roc_auc_score

FILE_PATH = Path(__file__).resolve()
ROOT_DIR = FILE_PATH.parents[3] 
DB_PATH = ROOT_DIR.parent / 'stiga_master.db'
MODEL_PATH = ROOT_DIR / 'src' / 'models' / 'stiga_triage_model.pkl'

def train_stiga_model():
    print(f"--- Entrenando Cerebro de Salud Andina ---")
    print(f"Base de datos: {DB_PATH}")

    # 1. Validación de existencia de datos
    if not DB_PATH.exists():
        print(f"Error: No se encontró la base de datos en {DB_PATH}")
        return

    # 2. Cargar Datos
    try:
        conn = sqlite3.connect(str(DB_PATH))
        df = pd.read_sql_query("SELECT * FROM master_triage", conn)
        conn.close()
    except Exception as e:
        print(f"Error al conectar con SQLite: {e}")
        return

    # 3. Selección de características 
    # Basado en SRP, mantenemos la lógica numérica separada de los síntomas
    features = ['age', 'gender', 'heart_rate', 'systolic_bp', 'o2_sat', 
                'body_temp', 'glucose', 'cholesterol']
    
    X = df[features]
    y = df['triage_level']

    # 4. División de Datos (Stratify es vital por el desbalance del 1.8% de Nivel 3)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 5. Pipeline de Machine Learning
    # Aplicamos SimpleImputer para manejar los NULLs de glucosa/síntomas del entorno rural
    pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler()),
        ('classifier', RandomForestClassifier(
            n_estimators=200, 
            class_weight='balanced', # Clave para detectar el Nivel 3 crítico
            random_state=42
        ))
    ])

    # 6. Entrenamiento Real
    print(f"🔄 Procesando {len(X_train)} registros para el proyecto final...")
    pipeline.fit(X_train, y_train)

    # 7. Evaluación de Precisión
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)

    print("\n--- ✅ Reporte de Rendimiento ---")
    print(classification_report(y_test, y_pred))
    
    # Métrica clave de éxito para tu tesis
    auc_score = roc_auc_score(y_test, y_prob, multi_class='ovr')
    print(f"\n🏆 AUC-ROC Final: {auc_score:.4f}")

    # 8. Persistencia del Modelo
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, str(MODEL_PATH))
    print(f"💾 Modelo guardado exitosamente en: {MODEL_PATH}")

if __name__ == "__main__":
    train_stiga_model()