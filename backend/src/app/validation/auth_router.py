from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, field_validator

from app.validation.auth_service import (
    forgot_password,
    get_profile,
    login_user,
    register_user,
    reset_password,
    resend_verification_code,
    solicitar_acceso_medico,
    update_profile,
    verify_user,
)
from app.validation.dependencies import get_current_user, validate_fecha_nacimiento

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# ── Modelos de entrada ───────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    nombre:           str
    email:            EmailStr
    password:         str
    cedula:           str
    telefono:         str
    direccion:        str
    eps:              str
    ciudad:           str
    fecha_nacimiento: str
    gender:           int   # 0=Femenino, 1=Masculino, 2=Desconocido

    @field_validator("fecha_nacimiento")
    @classmethod
    def check_fecha(cls, v: str) -> str:
        return validate_fecha_nacimiento(v)


class VerifyRequest(BaseModel):
    email: EmailStr
    code:  str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class ResendRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email:        EmailStr
    code:         str
    new_password: str


class SolicitudMedicoRequest(BaseModel):
    tipo_documento:   str
    numero_documento: str
    nombre:           str
    centro_salud:     str
    telefono:         str
    email:            EmailStr
    especialidad:     Optional[str] = None


class UpdateProfileRequest(BaseModel):
    nombre:           Optional[str] = None
    cedula:           Optional[str] = None
    telefono:         Optional[str] = None
    direccion:        Optional[str] = None
    eps:              Optional[str] = None
    ciudad:           Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    gender:           Optional[int] = None

    @field_validator("fecha_nacimiento")
    @classmethod
    def check_fecha(cls, v: str | None) -> str | None:
        return validate_fecha_nacimiento(v)


# ── Rutas ────────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    return register_user(body.model_dump())


@router.post("/verify")
def verify(body: VerifyRequest):
    return verify_user(body.email, body.code)


@router.post("/login")
def login(body: LoginRequest):
    return login_user(body.email, body.password)


@router.post("/resend-code")
def resend_code(body: ResendRequest):
    return resend_verification_code(body.email)


@router.post("/forgot-password")
def forgot_password_route(body: ForgotPasswordRequest):
    return forgot_password(body.email)


@router.post("/reset-password")
def reset_password_route(body: ResetPasswordRequest):
    return reset_password(body.email, body.code, body.new_password)


@router.post("/solicitar-medico", status_code=201)
def solicitar_medico(body: SolicitudMedicoRequest):
    return solicitar_acceso_medico(body.model_dump())


@router.get("/profile")
def get_profile_route(current_user: dict = Depends(get_current_user)):
    return get_profile(current_user["email"])


@router.put("/profile")
def update_profile_route(body: UpdateProfileRequest,
                         current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    return update_profile(current_user["email"], updates)
