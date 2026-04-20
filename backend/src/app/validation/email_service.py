import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("stiga.email")

EMAIL_USER     = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

_CARD_STYLE = (
    "max-width:480px; margin:auto; padding:32px;"
    "border:1px solid #e2e8ee; border-radius:12px;"
)
_CODE_STYLE = (
    "font-size:2.5rem; font-weight:800; letter-spacing:12px;"
    "color:#1a3a2e; text-align:center; padding:20px 0;"
)


def _send(to_email: str, subject: str, body_html: str):
    if not EMAIL_USER or not EMAIL_PASSWORD:
        logger.error("Credenciales de correo no configuradas en .env")
        raise RuntimeError("Servicio de correo no configurado.")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = EMAIL_USER
    msg["To"]      = to_email
    msg.attach(MIMEText(body_html, "html"))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
        logger.info(f"Correo enviado a {to_email}")
    except smtplib.SMTPAuthenticationError:
        logger.error("Error de autenticación SMTP")
        raise RuntimeError("Error de autenticación en el servicio de correo.")
    except Exception as e:
        logger.error(f"Error enviando correo a {to_email}: {e}")
        raise RuntimeError("No se pudo enviar el correo.")


def send_verification_email(to_email: str, nombre: str, code: str, expire_minutes: int):
    """Envía el código de verificación de cuenta."""
    body = f"""
    <html><body style="font-family:Arial,sans-serif;color:#1a2332;">
      <div style="{_CARD_STYLE}">
        <h2 style="color:#1a3a2e;">Bienvenido/a a STIGA, {nombre}</h2>
        <p>Su código de verificación es:</p>
        <div style="{_CODE_STYLE}">{code}</div>
        <p style="color:#7a9080;font-size:0.85rem;">
          Este código expira en {expire_minutes} minutos.<br>
          Si no solicitó este registro, ignore este mensaje.
        </p>
      </div>
    </body></html>
    """
    _send(to_email, "STIGA — Código de verificación de cuenta", body)


def send_reset_email(to_email: str, nombre: str, code: str, expire_minutes: int):
    """Envía el código de recuperación de contraseña."""
    body = f"""
    <html><body style="font-family:Arial,sans-serif;color:#1a2332;">
      <div style="{_CARD_STYLE}">
        <h2 style="color:#1a3a2e;">Recuperación de contraseña — STIGA</h2>
        <p>Hola {nombre}, recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Usa este código:</p>
        <div style="{_CODE_STYLE}">{code}</div>
        <p style="color:#7a9080;font-size:0.85rem;">
          Este código expira en {expire_minutes} minutos.<br>
          Si no solicitaste este cambio, ignora este mensaje.
        </p>
      </div>
    </body></html>
    """
    _send(to_email, "STIGA — Recuperación de contraseña", body)
