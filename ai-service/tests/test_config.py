import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_load_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_SERVICE_HOST", "127.0.0.1")
    monkeypatch.setenv("AI_SERVICE_PORT", "50052")
    monkeypatch.setenv("AI_SERVICE_MAX_WORKERS", "8")

    settings = Settings(_env_file=None)

    assert settings.ai_service_host == "127.0.0.1"
    assert settings.ai_service_port == 50052
    assert settings.ai_service_max_workers == 8
    assert settings.bind_address == "127.0.0.1:50052"


def test_settings_reject_invalid_port(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_SERVICE_PORT", "70000")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)
