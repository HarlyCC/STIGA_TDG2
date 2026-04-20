import logging

from app.data.database import get_conn

logger = logging.getLogger("stiga.db")

# ── Esquemas ─────────────────────────────────────────────────────────────────

_CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre               TEXT    NOT NULL,
    email                TEXT    UNIQUE NOT NULL,
    hashed_password      TEXT    NOT NULL,
    role                 TEXT    NOT NULL DEFAULT 'paciente',
    is_verified          INTEGER NOT NULL DEFAULT 0,
    verification_code    TEXT,
    verification_expires TEXT,
    cedula               TEXT,
    telefono             TEXT,
    direccion            TEXT,
    eps                  TEXT,
    ciudad               TEXT,
    fecha_nacimiento     TEXT,
    gender               INTEGER,
    created_at           TEXT    NOT NULL
)
"""

_CREATE_TRIAGE_RECORDS = """
CREATE TABLE IF NOT EXISTS triage_records (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id          TEXT,
    timestamp           TEXT,
    nombre              TEXT,
    cedula              TEXT,
    telefono            TEXT,
    direccion           TEXT,
    eps                 TEXT,
    age                 REAL,
    gender              REAL,
    heart_rate          REAL,
    systolic_bp         REAL,
    o2_sat              REAL,
    body_temp           REAL,
    glucose             REAL,
    cholesterol         REAL,
    symptoms            TEXT,
    symptom_severity    REAL,
    ciudad              TEXT,
    tiene_transporte    INTEGER,
    necesita_ambulancia INTEGER,
    triage_level        INTEGER,
    triage_color        TEXT,
    confianza           REAL,
    escalado            INTEGER
)
"""

_CREATE_MEDICO_HORARIOS = """
CREATE TABLE IF NOT EXISTS medico_horarios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    medico_email TEXT   NOT NULL,
    dia_semana  INTEGER NOT NULL,  -- 0=Lunes … 6=Domingo
    hora_inicio TEXT    NOT NULL,  -- formato HH:MM
    hora_fin    TEXT    NOT NULL,  -- formato HH:MM
    UNIQUE(medico_email, dia_semana)
)
"""

_CREATE_SOLICITUDES_MEDICO = """
CREATE TABLE IF NOT EXISTS solicitudes_medico (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_documento   TEXT NOT NULL,
    numero_documento TEXT NOT NULL,
    nombre           TEXT NOT NULL,
    centro_salud     TEXT NOT NULL,
    telefono         TEXT NOT NULL,
    email            TEXT NOT NULL,
    especialidad     TEXT,
    created_at       TEXT NOT NULL,
    estado           TEXT NOT NULL DEFAULT 'pendiente'
)
"""

_CREATE_CITAS = """
CREATE TABLE IF NOT EXISTS citas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente_email   TEXT NOT NULL,
    triaje_id        INTEGER,
    fecha_solicitada TEXT,
    hora_solicitada  TEXT,
    status           TEXT NOT NULL DEFAULT 'pendiente',
    creado_en        TEXT NOT NULL
)
"""

# ── Inicialización ────────────────────────────────────────────────────────────

def init_db():
    """
    Crea todas las tablas de la aplicación si no existen.
    Se ejecuta una sola vez al arrancar el servidor.
    Los registros existentes se conservan intactos.
    """
    with get_conn() as conn:
        conn.execute(_CREATE_USERS)
        conn.execute(_CREATE_TRIAGE_RECORDS)
        conn.execute(_CREATE_MEDICO_HORARIOS)
        conn.execute(_CREATE_SOLICITUDES_MEDICO)
        conn.execute(_CREATE_CITAS)
        # Migración: agregar user_email si no existe
        try:
            conn.execute("ALTER TABLE triage_records ADD COLUMN user_email TEXT")
            logger.info("Migración: columna user_email agregada a triage_records")
        except Exception:
            pass
        # Migración: columnas para recuperación de contraseña
        for col_def in [
            "ALTER TABLE users ADD COLUMN reset_code TEXT",
            "ALTER TABLE users ADD COLUMN reset_code_expires TEXT",
        ]:
            try:
                conn.execute(col_def)
            except Exception:
                pass
        # Migración: médico asignado y fecha de confirmación en citas
        for col_def in [
            "ALTER TABLE citas ADD COLUMN medico_email TEXT",
            "ALTER TABLE citas ADD COLUMN fecha_confirmada TEXT",
            "ALTER TABLE citas ADD COLUMN hora_confirmada TEXT",
        ]:
            try:
                conn.execute(col_def)
            except Exception:
                pass
    logger.info("Base de datos inicializada | tablas: users, triage_records, medico_horarios, citas")
