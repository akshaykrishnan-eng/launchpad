import asyncio
import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EmailService(Protocol):
    """Decouples business logic (app/services/registration.py) from how
    an email is actually delivered, so swapping in a real transactional
    email provider later means implementing this interface again, not
    touching OTP/registration logic -- same pattern as
    app/services/resume_storage.py's ResumeStorage."""

    async def send(self, *, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailService:
    """Development/test default: logs the email instead of sending it,
    so local and CI environments work with zero email configuration.
    Never logs OTPs/secrets at a level that would reach shared logs in
    a real deployment -- this provider is only ever selected when
    email_provider is left at its "console" default."""

    async def send(self, *, to: str, subject: str, body: str) -> None:
        logger.info("Email (console provider) to=%s subject=%s", to, subject)


class SMTPEmailService:
    """Minimal SMTP provider, configured entirely through environment
    variables (see .env.example) -- no credentials in source."""

    def __init__(self) -> None:
        self._host = settings.smtp_host
        self._port = settings.smtp_port
        self._username = settings.smtp_username
        self._password = settings.smtp_password
        self._use_tls = settings.smtp_use_tls
        self._from_addr = settings.email_from

    async def send(self, *, to: str, subject: str, body: str) -> None:
        await asyncio.to_thread(self._send_sync, to, subject, body)

    def _send_sync(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self._from_addr
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP(self._host, self._port) as server:
            if self._use_tls:
                server.starttls()
            if self._username:
                server.login(self._username, self._password)
            server.send_message(message)


_email_service: EmailService | None = None


def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        # "mailtrap" is the dev/staging value: Mailtrap's testing inbox is
        # configured via SMTP credentials (see .env.example), so it reuses
        # SMTPEmailService rather than a separate provider class -- only
        # the host/port/credentials differ. "smtp" is kept as a generic
        # alias for any other SMTP-based provider.
        if settings.email_provider in ("smtp", "mailtrap"):
            _email_service = SMTPEmailService()
        else:
            _email_service = ConsoleEmailService()
    return _email_service
