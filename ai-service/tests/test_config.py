import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_load_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_SERVICE_HOST", "127.0.0.1")
    monkeypatch.setenv("AI_SERVICE_PORT", "50052")
    monkeypatch.setenv("AI_SERVICE_MAX_WORKERS", "8")
    monkeypatch.setenv("ASR_PROVIDER", "faster-whisper")
    monkeypatch.setenv("ASR_LANGUAGE", "en")
    monkeypatch.setenv("ASR_MODEL_SIZE", "base")
    monkeypatch.setenv("ASR_DEVICE", "cpu")
    monkeypatch.setenv("ASR_COMPUTE_TYPE", "int8")
    monkeypatch.setenv("ASR_CPU_THREADS", "2")
    monkeypatch.setenv("ASR_NUM_WORKERS", "1")
    monkeypatch.setenv("ASR_LOCAL_FILES_ONLY", "true")
    monkeypatch.setenv("CHAPTERING_STRATEGY", "word")
    monkeypatch.setenv("CHAPTERING_MODEL_NAME", "chaptering-v1")
    monkeypatch.setenv("CHAPTERING_TARGET_UNIT_DURATION_SECONDS", "18")
    monkeypatch.setenv("CHAPTERING_MAX_UNIT_DURATION_SECONDS", "25")
    monkeypatch.setenv("CHAPTERING_TARGET_UNIT_WORDS", "70")
    monkeypatch.setenv("CHAPTERING_MAX_UNIT_WORDS", "140")
    monkeypatch.setenv("CHAPTERING_MAX_UNIT_CHARS", "900")
    monkeypatch.setenv("CHAPTERING_PAUSE_BOUNDARY_SECONDS", "1")
    monkeypatch.setenv("CHAPTERING_PUNCTUATION_POOR_THRESHOLD", "0.25")
    monkeypatch.setenv("CHAPTERING_CONTEXT_WINDOW_SECONDS", "100")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_SCORE_CONTEXT_SECONDS", "45")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_LONG_PAUSE_SECONDS", "2")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_MAX_PAUSE_SCORE_SECONDS", "4")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_MIN_CONTEXT_TEXT_CHARS", "100")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_DISCOURSE_MARKER_WEIGHT", "0.2")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_PAUSE_WEIGHT", "0.2")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_LEXICAL_SHIFT_WEIGHT", "0.2")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_BOUNDARY_QUALITY_WEIGHT", "0.2")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_DURATION_SANITY_WEIGHT", "0.2")
    monkeypatch.setenv("CHAPTERING_EMBEDDING_CANDIDATE_MIN_LIMIT", "8")
    monkeypatch.setenv("CHAPTERING_EMBEDDING_CANDIDATE_MAX_LIMIT", "120")
    monkeypatch.setenv("CHAPTERING_EMBEDDING_CANDIDATE_MULTIPLIER", "3")
    monkeypatch.setenv("CHAPTERING_CANDIDATE_TOP_SCORE_FRACTION", "0.5")

    settings = Settings(_env_file=None)

    assert settings.ai_service_host == "127.0.0.1"
    assert settings.ai_service_port == 50052
    assert settings.ai_service_max_workers == 8
    assert settings.bind_address == "127.0.0.1:50052"
    assert settings.asr_provider == "faster-whisper"
    assert settings.asr_language == "en"
    assert settings.asr_model_size == "base"
    assert settings.asr_device == "cpu"
    assert settings.asr_compute_type == "int8"
    assert settings.asr_cpu_threads == 2
    assert settings.asr_num_workers == 1
    assert settings.asr_local_files_only is True
    assert settings.chaptering_strategy == "word"
    assert settings.chaptering_model_name == "chaptering-v1"
    assert settings.chaptering_target_unit_duration_seconds == 18
    assert settings.chaptering_max_unit_duration_seconds == 25
    assert settings.chaptering_target_unit_words == 70
    assert settings.chaptering_max_unit_words == 140
    assert settings.chaptering_max_unit_chars == 900
    assert settings.chaptering_pause_boundary_seconds == 1
    assert settings.chaptering_punctuation_poor_threshold == 0.25
    assert settings.chaptering_context_window_seconds == 100
    assert settings.chaptering_candidate_score_context_seconds == 45
    assert settings.chaptering_candidate_long_pause_seconds == 2
    assert settings.chaptering_candidate_max_pause_score_seconds == 4
    assert settings.chaptering_candidate_min_context_text_chars == 100
    assert settings.chaptering_candidate_discourse_marker_weight == 0.2
    assert settings.chaptering_candidate_pause_weight == 0.2
    assert settings.chaptering_candidate_lexical_shift_weight == 0.2
    assert settings.chaptering_candidate_boundary_quality_weight == 0.2
    assert settings.chaptering_candidate_duration_sanity_weight == 0.2
    assert settings.chaptering_embedding_candidate_min_limit == 8
    assert settings.chaptering_embedding_candidate_max_limit == 120
    assert settings.chaptering_embedding_candidate_multiplier == 3
    assert settings.chaptering_candidate_top_score_fraction == 0.5


def test_settings_reject_invalid_port(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_SERVICE_PORT", "70000")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_treat_empty_model_storage_path_as_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ASR_MODEL_STORAGE_PATH", "")

    settings = Settings(_env_file=None)

    assert settings.asr_model_storage_path is None
