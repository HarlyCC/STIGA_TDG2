import os
from datetime import date, datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# ── JWT configuration ────────────────────────────────────────────────────────

_WEAK_SECRETS = {"stiga_jwt_secret_key_2024", "", "secret", "changeme"}

JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET or JWT_SECRET in _WEAK_SECRETS:
    raise RuntimeError(
        "JWT_SECRET is not set or is insecure. "
        "Define a random key of at least 32 characters in the .env file."
    )

JWT_ALGORITHM  = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer()

# ── Password hashing ─────────────────────────────────────────────────────────

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
    """FastAPI dependency: validates the JWT and returns {email, role, nombre}."""
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        email: str = payload.get("sub")
        if not email:
            raise ValueError("Token has no subject")
        return {
            "email":  email,
            "role":   payload.get("role"),
            "nombre": payload.get("nombre"),
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Birth date validation ────────────────────────────────────────────────────

def validate_fecha_nacimiento(v: str | None) -> str | None:
    """
    Validates that fecha_nacimiento is strictly YYYY-MM-DD and corresponds
    to an age between 0 and 120. Used as a shared Pydantic validator.
    """
    if v is None:
        return v
    try:
        born = date.fromisoformat(v)
    except ValueError:
        raise ValueError("Invalid format. Use YYYY-MM-DD (e.g. 1990-05-20).")
    today = date.today()
    if born > today:
        raise ValueError("Birth date cannot be in the future.")
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    if age > 120:
        raise ValueError("Birth date indicates an age greater than 120 years.")
    return v
