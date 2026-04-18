import sqlite3
import pandas as pd
import logging
import numpy as np
from src.app.data.data_cleaner import DataCleaner
from config.paths import DB_PATH, DATA_DIR

logger = logging.getLogger("stiga.data_merger")


class DataMerger:
    def __init__(self):
        self.db_path     = DB_PATH
        self.dataset_dir = DATA_DIR
        self.cleaner     = DataCleaner()
        logger.info(f"DataMerger inicializado | DB: {self.db_path}")

    def merge_all(self):
        """
        Fusiona los datasets con signos vitales reales para entrenamiento.
        Healthcare.csv se excluye: tiene age/gender pero sin signos vitales,
        lo que introduce ruido — el modelo ve el mismo vector de features
        para clases opuestas (Verde y Rojo), degradando accuracy de 86% a 53%.
        """
        logger.info("Iniciando fusión maestra de datasets")
        try:
            df1 = self._load_synthetic_triage()
            df2 = self._load_patient_priority()

            master_df = pd.concat([df1, df2], ignore_index=True)

            logger.info(f"synthetic_triage : {len(df1)} registros")
            logger.info(f"patient_priority : {len(df2)} registros")
            logger.info(f"Total fusionado  : {len(master_df)} registros")
            logger.info(
                f"Distribución triage:\n"
                f"{master_df['triage_level'].value_counts().sort_index()}"
            )

            with sqlite3.connect(self.db_path) as conn:
                master_df.to_sql("master_triage", conn, if_exists="replace", index=False)

            logger.info(f"{len(master_df)} registros guardados en 'master_triage'")

        except Exception as e:
            logger.error(f"Error en la fusión: {e}", exc_info=True)
            raise

    def _load_synthetic_triage(self) -> pd.DataFrame:
        """
        Dataset sintético de triaje de urgencias.
        No tiene columna gender — se deja como NaN (desconocido real).
        pain_level (1-10) se mapea a symptom_severity, alineando con
        la variable que usa el predictor en inferencia.
        """
        df = pd.read_csv(self.dataset_dir / "synthetic_medical_triage.csv", sep=";")
        return pd.DataFrame({
            "age":              df["age"].apply(self.cleaner.clean_numeric),
            "gender":           np.nan,
            "heart_rate":       df["heart_rate"].apply(self.cleaner.clean_numeric),
            "systolic_bp":      df["systolic_blood_pressure"].apply(self.cleaner.clean_numeric),
            "o2_sat":           df["oxygen_saturation"].apply(self.cleaner.clean_numeric),
            "body_temp":        df["body_temperature"].apply(self.cleaner.clean_numeric),
            "glucose":          np.nan,
            "cholesterol":      np.nan,
            "symptom_severity": df["pain_level"].apply(self.cleaner.clean_numeric),
            "triage_level":     df["triage_level"].apply(self.cleaner.clean_triage_label),
        })

    def _load_patient_priority(self) -> pd.DataFrame:
        """
        Dataset de prioridad de pacientes con signos vitales y etiquetas de triaje.
        max heart rate es la frecuencia cardíaca máxima registrada — se usa
        como aproximación a heart_rate por ser el único campo disponible.
        """
        df = pd.read_csv(self.dataset_dir / "patient_priority.csv", sep=";")
        df = df.dropna(subset=["triage"])
        return pd.DataFrame({
            "age":              df["age"].apply(self.cleaner.clean_numeric),
            "gender":           df["gender"].apply(self.cleaner.clean_gender),
            "heart_rate":       df["max heart rate"].apply(self.cleaner.clean_numeric),
            "systolic_bp":      df["blood pressure"].apply(self.cleaner.clean_numeric),
            "o2_sat":           np.nan,
            "body_temp":        np.nan,
            "glucose":          df["plasma glucose"].apply(self.cleaner.clean_numeric),
            "cholesterol":      df["cholesterol"].apply(self.cleaner.clean_numeric),
            "symptom_severity": np.nan,
            "triage_level":     df["triage"].apply(self.cleaner.clean_triage_label),
        })
