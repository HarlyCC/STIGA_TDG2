# config/paths.py
from pathlib import Path

def _find_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError(
        "No se encontró la raíz del proyecto. "
        "Asegúrate de tener .git o pyproject.toml en la raíz."
    )

ROOT_DIR   = _find_root()
LOGS_DIR   = ROOT_DIR / "logs"
MODELS_DIR = ROOT_DIR / "src" / "models"
DATA_DIR   = ROOT_DIR / "src" / "data_science" / "datasets"
DB_PATH    = ROOT_DIR / "stiga_master.db"