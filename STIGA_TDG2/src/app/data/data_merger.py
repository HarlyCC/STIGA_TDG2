import os
import sqlite3
import pandas as pd
from pathlib import Path
from app.services.data_cleaner import DataCleaner

# --- CONFIGURACIÓN DE RUTAS ESTILO ROOT_DIR ---
# Ubicación: C:\Users\harly\Desktop\STIGA_TDG2\STIGA_TDG2\src\app\data\data_merger.py
# parents[3] nos lleva a la carpeta interna 'STIGA_TDG2' que contiene a 'src'
ROOT_DIR = Path(__file__).resolve().parents[3] 

class DataMerger:
    def __init__(self):
        self.db_path = ROOT_DIR.parent / "stiga_master.db"
        self.dataset_dir = ROOT_DIR / "src" / "data_science" / "datasets"
        
        self.cleaner = DataCleaner()
    
        print(f"--- STIGA DataMerger Cargado ---")
        print(f"ROOT_DIR: {ROOT_DIR}")
        print(f"Destino DB: {self.db_path}")

    def merge_all(self):
        try:
            print("--- Iniciando fusión Maestra de Datasets ---")
            path1 = self.dataset_dir / "synthetic_medical_triage.csv"
            df1 = pd.read_csv(str(path1), sep=";")
            
            df1_clean = pd.DataFrame({
                "age": df1["age"].apply(self.cleaner.clean_numeric),
                "gender": 2, # Categoría 'Otro/Desconocido'
                "heart_rate": df1["heart_rate"],
                "systolic_bp": df1["systolic_blood_pressure"],
                "o2_sat": df1["oxygen_saturation"],
                "body_temp": df1["body_temperature"].apply(lambda x: self.cleaner.clean_numeric(x, 36.5)),
                "glucose": None,
                "cholesterol": None,
                "symptoms": None,
                "triage_level": df1["triage_level"].apply(self.cleaner.clean_triage_label),
            })

            path2 = self.dataset_dir / "Healthcare.csv"
            df2 = pd.read_csv(str(path2), sep=";")
            
            df2_clean = pd.DataFrame({
                "age": df2["Age"],
                "gender": df2["Gender"].apply(self.cleaner.clean_gender),
                "heart_rate": None,
                "systolic_bp": None,
                "o2_sat": None,
                "body_temp": None,
                "glucose": None,
                "cholesterol": None,
                "symptoms": df2["Symptoms"],
                "triage_level": 0, # Nivel base para síntomas generales
            })

            path3 = self.dataset_dir / "patient_priority.csv"
            df3 = pd.read_csv(str(path3), sep=";")
            df3 = df3.dropna(subset=["triage"]) # Limpieza de nulos crítica

            df3_clean = pd.DataFrame({
                "age": df3["age"].apply(self.cleaner.clean_numeric),
                "gender": df3["gender"].apply(self.cleaner.clean_gender),
                "heart_rate": df3["max heart rate"],
                "systolic_bp": df3["blood pressure"],
                "o2_sat": None,
                "body_temp": None,
                "glucose": df3["plasma glucose"],
                "cholesterol": df3["cholesterol"],
                "symptoms": None,
                "triage_level": df3["triage"].apply(self.cleaner.clean_triage_label),
            })

            # 4. Concatenación final de los 49,552 registros
            master_df = pd.concat([df1_clean, df2_clean, df3_clean], ignore_index=True)

            # 5. Guardar en SQLite
            with sqlite3.connect(str(self.db_path)) as conn:
                master_df.to_sql("master_triage", conn, if_exists="replace", index=False)
            
            print(f"¡Éxito! {len(master_df)} registros guardados en 'master_triage'.")

        except Exception as e:
            print(f"Error en el proceso de fusión: {e}")
            raise