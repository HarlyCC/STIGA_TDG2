import sqlite3
from config.paths import DB_PATH


def get_conn() -> sqlite3.Connection:
    """
    Retorna una conexión SQLite con row_factory configurado.
    Usar siempre como context manager: with get_conn() as conn:
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
