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
        logger.error("Email credentials not configured in .env")
        raise RuntimeError("Email service not configured.")
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
        logger.info(f"Email sent to {to_email}")
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication error")
        raise RuntimeError("Email service authentication error.")
    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {e}")
        raise RuntimeError("Could not send email.")


def send_verification_email(to_email: str, nombre: str, code: str, expire_minutes: int):
    """Sends the account verification code."""
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


def send_doctor_access_request_email(datos: dict):
    """Notifies the system administrator about a new doctor access request."""
    if not EMAIL_USER:
        logger.warning("EMAIL_USER not configured — request not notified by email")
        return
    body = f"""
    <html><body style="font-family:Arial,sans-serif;color:#1a2332;">
      <div style="{_CARD_STYLE}">
        <div style="background:linear-gradient(135deg,#0f2318,#1a3a2e);border-radius:8px 8px 0 0;padding:20px 24px;margin:-32px -32px 24px;">
          <h2 style="color:white;margin:0;font-size:1.15rem;">Nueva solicitud de acceso médico</h2>
          <p style="color:rgba(255,255,255,0.5);margin:4px 0 0;font-size:0.82rem;">STIGA — Sistema de Triaje Inteligente</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <tr><td style="padding:7px 0;color:#6b7280;width:40%;">Nombre</td><td style="padding:7px 0;font-weight:600;color:#06111f;">{datos['nombre']}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:7px 6px;color:#6b7280;">Tipo de documento</td><td style="padding:7px 6px;font-weight:600;color:#06111f;">{datos['tipo_documento']}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280;">Número de documento</td><td style="padding:7px 0;font-weight:600;color:#06111f;">{datos['numero_documento']}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:7px 6px;color:#6b7280;">Centro de salud / IPS</td><td style="padding:7px 6px;font-weight:600;color:#06111f;">{datos['centro_salud']}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280;">Especialidad</td><td style="padding:7px 0;font-weight:600;color:#06111f;">{datos.get('especialidad') or '—'}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:7px 6px;color:#6b7280;">Teléfono de contacto</td><td style="padding:7px 6px;font-weight:600;color:#06111f;">{datos['telefono']}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280;">Correo electrónico</td><td style="padding:7px 0;font-weight:600;color:#2e8fc0;">{datos['email']}</td></tr>
        </table>
        <div style="margin-top:24px;padding:14px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
          <p style="margin:0;color:#15803d;font-size:0.85rem;font-weight:600;">
            Para aprobar esta solicitud, crea la cuenta desde el panel de administración en la pestaña <em>Usuarios</em>.
          </p>
        </div>
        <p style="margin-top:20px;color:#9ca3af;font-size:0.75rem;">Universidad Católica Luis Amigó · STIGA 2026</p>
      </div>
    </body></html>
    """
    _send(EMAIL_USER, "STIGA — Nueva solicitud de acceso médico", body)


def send_reset_email(to_email: str, nombre: str, code: str, expire_minutes: int):
    """Sends the password recovery code."""
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
