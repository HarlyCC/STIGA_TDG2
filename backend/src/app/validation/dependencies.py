import os
from datetime import date, datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# ── Configuración JWT ────────────────────────────────────────────────────────

JWT_SECRET     = os.getenv("JWT_SECRET", "stiga_jwt_secret_key_2024")
JWT_ALGORITHM  = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer()

# ── Contraseñas ──────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


# ── JWT ──────────────────────────────────────────────────────────────────────

def create_jwt(email: str, role: str, nombre: str) -> str:
    payload = {
        "sub":    email,
        "role":   role,
        "nombre": nombre,
        "exp":    datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    """Dependencia FastAPI: valida el JWT y retorna {email, role, nombre}."""
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        email: str = payload.get("sub")
        if not email:
            raise ValueError("Token sin sujeto")
        return {
            "email":  email,
            "role":   payload.get("role"),
            "nombre": payload.get("nombre"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Validación de fecha de nacimiento ────────────────────────────────────────

def validate_fecha_nacimiento(v: str | None) -> str | None:
    """
    Valida que fecha_nacimiento sea YYYY-MM-DD estricto y corresponda
    a una edad entre 0 y 120 años. Usado como validador Pydantic compartido.
    """
    if v is None:
        return v
    try:
        born = date.fromisoformat(v)
    except ValueError:
        raise ValueError("Formato inválido. Use YYYY-MM-DD (ej: 1990-05-20).")
    today = date.today()
    if born > today:
        raise ValueError("La fecha de nacimiento no puede ser una fecha futura.")
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    if age > 120:
        raise ValueError("La fecha de nacimiento indica una edad mayor a 120 años.")
    return v
