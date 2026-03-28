from pathlib import Path

ROOT_DIR   = Path(__file__).resolve().parents[1]
LOGS_DIR   = ROOT_DIR / "logs"
MODELS_DIR = ROOT_DIR / "src" / "models"
DATA_DIR   = ROOT_DIR / "src" / "data_science" / "datasets"
DB_PATH    = ROOT_DIR / "stiga_master.db"