import logging
import smtplib
import ssl
from email.message import EmailMessage

from config import get_settings

logger = logging.getLogger("invex.mail")
settings = get_settings()


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalize_password(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = "".join(value.split())
    return cleaned or None


def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Sends an OTP to the specified email address using SMTP.
    If SMTP is not configured, logs the OTP to the console (useful for local dev).
    """
    smtp_server = _normalize_text(settings.SMTP_SERVER)
    smtp_username = _normalize_text(settings.SMTP_USERNAME)
    smtp_password = _normalize_password(settings.SMTP_PASSWORD)
    from_email = _normalize_text(settings.SMTP_FROM_EMAIL) or smtp_username

    if not smtp_server or not smtp_username or not smtp_password:
        logger.warning("SMTP not fully configured. Printing OTP to console instead.")
        print(f"\n{'=' * 40}")
        print(f"🔐 MOCK EMAIL to {to_email}")
        print(f"🔑 Your OTP is: {otp}")
        print(f"{'=' * 40}\n")
        return True

    msg = EmailMessage()
    msg["Subject"] = "Your Invex Login OTP"
    msg["From"] = from_email
    msg["To"] = to_email

    msg.set_content(
        f"Hello,\n\n"
        f"Your One-Time Password (OTP) for Invex is: {otp}\n\n"
        f"This OTP is valid for 5 minutes. Do not share this with anyone.\n\n"
        f"If you didn't request this, please ignore this email.\n"
    )

    msg.add_alternative(
        f"""
        <html>
            <body>
                <h2>Your Invex Login OTP</h2>
                <p>Hello,</p>
                <p>Your One-Time Password (OTP) for Invex is:</p>
                <h1 style="color: #2563eb; letter-spacing: 2px;">{otp}</h1>
                <p>This OTP is valid for <strong>5 minutes</strong>. Do not share this with anyone.</p>
                <p style="color: #6b7280; font-size: 0.875rem;">If you didn't request this, please ignore this email.</p>
            </body>
        </html>
        """,
        subtype="html",
    )

    try:
        use_ssl = bool(settings.SMTP_USE_SSL or settings.SMTP_PORT == 465)
        use_starttls = bool(settings.SMTP_USE_STARTTLS and not use_ssl)
        tls_context = ssl.create_default_context()

        smtp_factory = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with smtp_factory(smtp_server, settings.SMTP_PORT, timeout=settings.SMTP_TIMEOUT_SECONDS) as server:
            server.ehlo()
            if use_starttls:
                server.starttls(context=tls_context)
                server.ehlo()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)

        logger.info("OTP email sent successfully to %s via %s:%s", to_email, smtp_server, settings.SMTP_PORT)
        return True

    except Exception:
        logger.exception("Failed to send OTP email to %s", to_email)
        print(f"\n[FALLBACK] 🔑 OTP for {to_email}: {otp}\n")
        return False
