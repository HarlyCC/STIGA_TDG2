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
    timestamp           TEXT    NOT NULL,
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
    respiratory_rate    REAL,
    pain_scale          REAL,
    symptom_duration    REAL,
    ciudad              TEXT,
    tiene_transporte    INTEGER,
    necesita_ambulancia INTEGER,
    triage_level        INTEGER,
    triage_color        TEXT    NOT NULL DEFAULT 'Verde',
    confianza           REAL,
    escalado            INTEGER,
    user_email          TEXT    NOT NULL
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
    medico_email     TEXT,
    triaje_id        INTEGER,
    fecha_solicitada TEXT,
    hora_solicitada  TEXT,
    fecha_confirmada TEXT,
    hora_confirmada  TEXT,
    status           TEXT NOT NULL DEFAULT 'pendiente',
    creado_en        TEXT NOT NULL
)
"""

_CREATE_ALERTAS_CRITICAS = """
CREATE TABLE IF NOT EXISTS alertas_criticas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    triaje_id          INTEGER NOT NULL,
    paciente_email     TEXT    NOT NULL,
    paciente_nombre    TEXT,
    paciente_telefono  TEXT,
    ciudad             TEXT,
    triage_color       TEXT    NOT NULL,
    created_at         TEXT    NOT NULL,
    leida              INTEGER NOT NULL DEFAULT 0,
    estado             TEXT    NOT NULL DEFAULT 'pendiente'
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
        # WAL mode: permite lecturas concurrentes sin bloqueos
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")

        conn.execute(_CREATE_USERS)
        conn.execute(_CREATE_TRIAGE_RECORDS)
        conn.execute(_CREATE_MEDICO_HORARIOS)
        conn.execute(_CREATE_SOLICITUDES_MEDICO)
        conn.execute(_CREATE_CITAS)
        conn.execute(_CREATE_ALERTAS_CRITICAS)

        # ── Migraciones de columnas ───────────────────────────────────────────
        _migrations = [
            "ALTER TABLE triage_records ADD COLUMN user_email TEXT",
            "ALTER TABLE users ADD COLUMN reset_code TEXT",
            "ALTER TABLE users ADD COLUMN reset_code_expires TEXT",
            "ALTER TABLE citas ADD COLUMN medico_email TEXT",
            "ALTER TABLE citas ADD COLUMN fecha_confirmada TEXT",
            "ALTER TABLE citas ADD COLUMN hora_confirmada TEXT",
            "ALTER TABLE alertas_criticas ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente'",
            "ALTER TABLE triage_records ADD COLUMN respiratory_rate REAL",
            "ALTER TABLE triage_records ADD COLUMN pain_scale REAL",
            "ALTER TABLE triage_records ADD COLUMN symptom_duration REAL",
            "ALTER TABLE triage_records ADD COLUMN medico_email TEXT",
            "ALTER TABLE citas ADD COLUMN en_llamada INTEGER DEFAULT 0",
        ]
        for sql in _migrations:
            try:
                conn.execute(sql)
            except Exception:
                pass

        # ── Índices ───────────────────────────────────────────────────────────
        _indexes = [
            "CREATE INDEX IF NOT EXISTS idx_triage_user_email  ON triage_records(user_email)",
            "CREATE INDEX IF NOT EXISTS idx_triage_color       ON triage_records(triage_color)",
            "CREATE INDEX IF NOT EXISTS idx_triage_ciudad      ON triage_records(ciudad)",
            "CREATE INDEX IF NOT EXISTS idx_triage_timestamp   ON triage_records(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_triage_cedula      ON triage_records(cedula)",
            "CREATE INDEX IF NOT EXISTS idx_citas_paciente     ON citas(paciente_email)",
            "CREATE INDEX IF NOT EXISTS idx_citas_medico       ON citas(medico_email)",
            "CREATE INDEX IF NOT EXISTS idx_citas_status       ON citas(status)",
            "CREATE INDEX IF NOT EXISTS idx_alertas_leida      ON alertas_criticas(leida)",
            "CREATE INDEX IF NOT EXISTS idx_alertas_estado     ON alertas_criticas(estado)",
            "CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role)",
        ]
        for sql in _indexes:
            conn.execute(sql)

    logger.info("Base de datos inicializada | WAL mode ON | índices aplicados")
