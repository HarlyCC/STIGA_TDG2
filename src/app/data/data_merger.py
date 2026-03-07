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
        logger.info("Iniciando fusión maestra de datasets")
        try:
            df1_clean = self._load_synthetic_triage()
            df2_clean = self._load_healthcare()
            df3_clean = self._load_patient_priority()

            master_df = pd.concat([df1_clean, df2_clean, df3_clean], ignore_index=True)

            with sqlite3.connect(self.db_path) as conn:
                master_df.to_sql("master_triage", conn, if_exists="replace", index=False)

            logger.info(f"{len(master_df)} registros guardados en 'master_triage'")

        except Exception as e:
            logger.error(f"Error en la fusión: {e}", exc_info=True)
            raise

    def _load_synthetic_triage(self) -> pd.DataFrame:
        df = pd.read_csv(self.dataset_dir / "synthetic_medical_triage.csv", sep=";")
        return pd.DataFrame({
            "age":          df["age"].apply(self.cleaner.clean_numeric),
            "gender":       2,
            "heart_rate":   df["heart_rate"],
            "systolic_bp":  df["systolic_blood_pressure"],
            "o2_sat":       df["oxygen_saturation"],
            "body_temp":    df["body_temperature"].apply(self.cleaner.clean_numeric),
            "glucose":      np.nan,
            "cholesterol":  np.nan,
            "symptoms":     np.nan,
            "triage_level": df["triage_level"].apply(self.cleaner.clean_triage_label),
        })

    def _load_healthcare(self) -> pd.DataFrame:
        df = pd.read_csv(self.dataset_dir / "Healthcare.csv", sep=";")
        return pd.DataFrame({
            "age":          df["Age"],
            "gender":       df["Gender"].apply(self.cleaner.clean_gender),
            "heart_rate":   np.nan,
            "systolic_bp":  np.nan,
            "o2_sat":       np.nan,
            "body_temp":    np.nan,
            "glucose":      np.nan,
            "cholesterol":  np.nan,
            "symptoms":     df["Symptoms"],
            "triage_level": np.nan,
        })

    def _load_patient_priority(self) -> pd.DataFrame:
        df = pd.read_csv(self.dataset_dir / "patient_priority.csv", sep=";")
        df = df.dropna(subset=["triage"])
        return pd.DataFrame({
            "age":          df["age"].apply(self.cleaner.clean_numeric),
            "gender":       df["gender"].apply(self.cleaner.clean_gender),
            "heart_rate":   df["max heart rate"],
            "systolic_bp":  df["blood pressure"],
            "o2_sat":       np.nan,
            "body_temp":    np.nan,
            "glucose":      df["plasma glucose"],
            "cholesterol":  df["cholesterol"],
            "symptoms":     np.nan,
            "triage_level": df["triage"].apply(self.cleaner.clean_triage_label),
        })