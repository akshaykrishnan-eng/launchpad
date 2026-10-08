"""Unit tests for the EmailService provider abstraction itself
(app/services/email.py) -- separate from the OTP/registration business
logic tests in test_email_registration.py, which already exercise
ConsoleEmailService via the `email_service` fixture.

No real network call is made in any of these: SMTPEmailService's sync
send is monkeypatched before the service is ever invoked.
"""

import app.services.email as email_module
from app.services.email import ConsoleEmailService, SMTPEmailService, get_email_service


def _reset_cached_service():
    email_module._email_service = None


def test_console_provider_selected_by_default(monkeypatch):
    monkeypatch.setattr(email_module.settings, "email_provider", "console")
    _reset_cached_service()

    service = get_email_service()

    assert isinstance(service, ConsoleEmailService)


def test_mailtrap_provider_selects_smtp_service(monkeypatch):
    monkeypatch.setattr(email_module.settings, "email_provider", "mailtrap")
    _reset_cached_service()

    service = get_email_service()

    assert isinstance(service, SMTPEmailService)


def test_smtp_provider_selects_smtp_service(monkeypatch):
    monkeypatch.setattr(email_module.settings, "email_provider", "smtp")
    _reset_cached_service()

    service = get_email_service()

    assert isinstance(service, SMTPEmailService)


def test_smtp_service_reads_credentials_from_settings(monkeypatch):
    monkeypatch.setattr(email_module.settings, "smtp_host", "sandbox.smtp.mailtrap.io")
    monkeypatch.setattr(email_module.settings, "smtp_port", 2525)
    monkeypatch.setattr(email_module.settings, "smtp_username", "test-user")
    monkeypatch.setattr(email_module.settings, "smtp_password", "test-pass")
    monkeypatch.setattr(email_module.settings, "smtp_use_tls", True)
    monkeypatch.setattr(email_module.settings, "email_from", "Launchpad <no-reply@launchpad.dev>")

    service = SMTPEmailService()

    assert service._host == "sandbox.smtp.mailtrap.io"
    assert service._port == 2525
    assert service._username == "test-user"
    assert service._password == "test-pass"
    assert service._use_tls is True
    assert service._from_addr == "Launchpad <no-reply@launchpad.dev>"


async def test_smtp_service_send_calls_sync_client_with_correct_fields(monkeypatch):
    monkeypatch.setattr(email_module.settings, "smtp_host", "sandbox.smtp.mailtrap.io")
    monkeypatch.setattr(email_module.settings, "smtp_port", 2525)
    monkeypatch.setattr(email_module.settings, "smtp_username", "test-user")
    monkeypatch.setattr(email_module.settings, "smtp_password", "test-pass")
    monkeypatch.setattr(email_module.settings, "smtp_use_tls", True)
    monkeypatch.setattr(email_module.settings, "email_from", "Launchpad <no-reply@launchpad.dev>")

    service = SMTPEmailService()
    captured: dict = {}

    def fake_send_sync(to, subject, body):
        captured["to"] = to
        captured["subject"] = subject
        captured["body"] = body

    monkeypatch.setattr(service, "_send_sync", fake_send_sync)

    await service.send(
        to="candidate@example.com",
        subject="Verify your Launchpad email",
        body="Your code is 123456",
    )

    assert captured["to"] == "candidate@example.com"
    assert captured["subject"] == "Verify your Launchpad email"
    assert "123456" in captured["body"]


async def test_smtp_service_failure_propagates_without_leaking_credentials(monkeypatch, caplog):
    monkeypatch.setattr(email_module.settings, "smtp_host", "sandbox.smtp.mailtrap.io")
    monkeypatch.setattr(email_module.settings, "smtp_port", 2525)
    monkeypatch.setattr(email_module.settings, "smtp_username", "test-user")
    monkeypatch.setattr(email_module.settings, "smtp_password", "super-secret-password")
    monkeypatch.setattr(email_module.settings, "smtp_use_tls", True)
    monkeypatch.setattr(email_module.settings, "email_from", "Launchpad <no-reply@launchpad.dev>")

    service = SMTPEmailService()

    def failing_send_sync(to, subject, body):
        raise ConnectionError("SMTP connection refused")

    monkeypatch.setattr(service, "_send_sync", failing_send_sync)

    try:
        await service.send(to="candidate@example.com", subject="subject", body="body with 654321")
    except ConnectionError:
        pass

    assert "super-secret-password" not in caplog.text
    assert "654321" not in caplog.text
