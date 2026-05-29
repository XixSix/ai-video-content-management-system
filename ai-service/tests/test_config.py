import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_load_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_SERVICE_HOST", "127.0.0.1")
    monkeypatch.setenv("AI_SERVICE_PORT", "50052")
    monkeypatch.setenv("AI_SERVICE_MAX_WORKERS", "8")
    monkeypatch.setenv("ASR_PROVIDER", "faster-whisper")
    monkeypatch.setenv("ASR_MODEL_SIZE", "base")
    monkeypatch.setenv("ASR_DEVICE", "cpu")
    monkeypatch.setenv("ASR_COMPUTE_TYPE", "int8")
    monkeypatch.setenv("ASR_CPU_THREADS", "2")
    monkeypatch.setenv("ASR_NUM_WORKERS", "1")
    monkeypatch.setenv("ASR_LOCAL_FILES_ONLY", "true")

    settings = Settings(_env_file=None)

    assert settings.ai_service_host == "127.0.0.1"
    assert settings.ai_service_port == 50052
    assert settings.ai_service_max_workers == 8
    assert settings.bind_address == "127.0.0.1:50052"
    assert settings.asr_provider == "faster-whisper"
    assert settings.asr_model_size == "base"
    assert settings.asr_device == "cpu"
    assert settings.asr_compute_type == "int8"
    assert settings.asr_cpu_threads == 2
    assert settings.asr_num_workers == 1
    assert settings.asr_local_files_only is True


def test_settings_reject_invalid_port(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_SERVICE_PORT", "70000")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)
