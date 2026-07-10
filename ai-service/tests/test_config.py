import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_use_generate_chapters_defaults() -> None:
    settings = Settings(_env_file=None)

    assert settings.generate_chapters_target_unit_duration_seconds == 12
    assert settings.diarization_provider == "noop"
    assert settings.pyannote_auth_token == ""
    assert (
        settings.pyannote_diarization_model
        == "pyannote/speaker-diarization-community-1"
    )
    assert settings.diarization_device == "cpu"
    assert settings.source_separation_provider == "noop"
    assert settings.demucs_model == "htdemucs"
    assert settings.demucs_device == "cpu"
    assert str(settings.demucs_output_dir) == "/tmp/vid-pilot-demucs"
    assert settings.demucs_jobs == 1
    assert settings.demucs_shifts == 0
    assert settings.demucs_overlap == 0.25
    assert settings.audio_decoder_provider == "noop"
    assert settings.audio_min_sample_rate == 8_000
    assert settings.audio_max_sample_rate == 192_000
    assert settings.audio_supported_channels == (1, 2)
    assert settings.audio_target_sample_rate == 16_000
    assert settings.audio_target_loudness == -16.0
    assert settings.audio_min_loudness == -70.0
    assert settings.audio_min_normalize_seconds == 0.4
    assert settings.audio_peak_ceiling == 0.98
    assert settings.vad_provider == "noop"
    assert settings.vad_sample_rate == 16_000
    assert settings.vad_threshold == 0.5
    assert settings.vad_min_speech_duration_ms == 250
    assert settings.vad_min_silence_duration_ms == 100
    assert settings.vad_speech_pad_ms == 30
    assert settings.vad_use_onnx is False
    assert settings.vad_min_total_speech_ms == 250
    assert settings.vad_min_speech_ratio == 0
    assert settings.offline_asr_pad_seconds == 0.25
    assert settings.offline_asr_merge_gap_seconds == 0.6
    assert settings.offline_asr_max_window_seconds == 30
    assert settings.offline_asr_min_window_seconds == 1.2
    assert settings.generate_chapters_embedding_provider == "noop"
    assert (
        settings.generate_chapters_embedding_model_name == "Qwen/Qwen3-Embedding-0.6B"
    )
    assert settings.generate_chapters_embedding_device == "cpu"
    assert settings.generate_chapters_embedding_batch_size == 8
    assert settings.generate_chapters_embedding_max_sequence_length == 2048
    assert settings.generate_chapters_embedding_cache_path is None
    assert settings.generate_chapters_embedding_local_files_only is False
    assert settings.generate_chapters_boundary_evaluation_provider == "noop"
    assert settings.generate_chapters_title_provider == "noop"
    assert settings.generate_short_clips_candidate_provider == "noop"
    assert settings.generate_short_clips_model_name == "noop-generate-short-clips-v1"
    assert settings.llm_base_url == "http://localhost:8000/v1"
    assert settings.llm_api_key == ""
    assert settings.llm_model_name == "Qwen/Qwen3-8B"
    assert settings.llm_timeout_seconds == 30
    assert settings.llm_temperature == 0
    assert settings.llm_max_tokens == 1024
    assert settings.generate_chapters_max_unit_duration_seconds == 20
    assert settings.generate_chapters_target_unit_words == 40
    assert settings.generate_chapters_max_unit_words == 80
    assert settings.generate_chapters_unit_repair_short_duration_seconds == 4
    assert settings.generate_chapters_unit_repair_min_words == 8
    assert settings.generate_chapters_unit_repair_fragment_max_words == 2
    assert settings.generate_chapters_unit_repair_sparse_duration_seconds == 6
    assert settings.generate_chapters_unit_repair_continuation_gap_seconds == 0.05
    assert settings.generate_chapters_valley_smoothing_radius == 1
    assert settings.generate_chapters_valley_peak_window == 2
    assert settings.generate_chapters_valley_min_depth == 0.18
    assert settings.generate_chapters_valley_semantic_weight == 0.70


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
    monkeypatch.setenv("DIARIZATION_PROVIDER", "pyannote")
    monkeypatch.setenv("PYANNOTE_AUTH_TOKEN", "hf_token")
    monkeypatch.setenv("PYANNOTE_DIARIZATION_MODEL", "pyannote/custom")
    monkeypatch.setenv("DIARIZATION_DEVICE", "cuda")
    monkeypatch.setenv("SOURCE_SEPARATION_PROVIDER", "demucs")
    monkeypatch.setenv("DEMUCS_MODEL", "htdemucs_ft")
    monkeypatch.setenv("DEMUCS_DEVICE", "cuda")
    monkeypatch.setenv("DEMUCS_OUTPUT_DIR", "/tmp/custom-demucs")
    monkeypatch.setenv("DEMUCS_JOBS", "2")
    monkeypatch.setenv("DEMUCS_SHIFTS", "1")
    monkeypatch.setenv("DEMUCS_OVERLAP", "0.4")
    monkeypatch.setenv("AUDIO_DECODER_PROVIDER", "torchaudio")
    monkeypatch.setenv("AUDIO_MIN_SAMPLE_RATE", "4000")
    monkeypatch.setenv("AUDIO_MAX_SAMPLE_RATE", "96000")
    monkeypatch.setenv("AUDIO_SUPPORTED_CHANNELS", "[1,2,4]")
    monkeypatch.setenv("AUDIO_TARGET_SAMPLE_RATE", "16000")
    monkeypatch.setenv("AUDIO_TARGET_LOUDNESS", "-18")
    monkeypatch.setenv("AUDIO_MIN_LOUDNESS", "-80")
    monkeypatch.setenv("AUDIO_MIN_NORMALIZE_SECONDS", "0.5")
    monkeypatch.setenv("AUDIO_PEAK_CEILING", "0.95")
    monkeypatch.setenv("AUDIO_WAV_PCM_SAMPLE_WIDTH_BYTES", "2")
    monkeypatch.setenv("AUDIO_ENABLE_LOUDNESS_NORMALIZATION", "false")
    monkeypatch.setenv("VAD_PROVIDER", "silero")
    monkeypatch.setenv("VAD_SAMPLE_RATE", "16000")
    monkeypatch.setenv("VAD_THRESHOLD", "0.6")
    monkeypatch.setenv("VAD_MIN_SPEECH_DURATION_MS", "200")
    monkeypatch.setenv("VAD_MIN_SILENCE_DURATION_MS", "300")
    monkeypatch.setenv("VAD_SPEECH_PAD_MS", "50")
    monkeypatch.setenv("VAD_USE_ONNX", "true")
    monkeypatch.setenv("VAD_MIN_TOTAL_SPEECH_MS", "500")
    monkeypatch.setenv("VAD_MIN_SPEECH_RATIO", "0.05")
    monkeypatch.setenv("OFFLINE_ASR_PAD_SECONDS", "0.2")
    monkeypatch.setenv("OFFLINE_ASR_MERGE_GAP_SECONDS", "0.4")
    monkeypatch.setenv("OFFLINE_ASR_MAX_WINDOW_SECONDS", "20")
    monkeypatch.setenv("OFFLINE_ASR_MIN_WINDOW_SECONDS", "1.5")
    monkeypatch.setenv("GENERATE_CHAPTERS_STRATEGY", "word")
    monkeypatch.setenv("GENERATE_CHAPTERS_MODEL_NAME", "generate-chapters-v1")
    monkeypatch.setenv(
        "GENERATE_CHAPTERS_BOUNDARY_EVALUATION_PROVIDER",
        "openai-compatible",
    )
    monkeypatch.setenv("GENERATE_CHAPTERS_TITLE_PROVIDER", "openai-compatible")
    monkeypatch.setenv("GENERATE_SHORT_CLIPS_CANDIDATE_PROVIDER", "openai-compatible")
    monkeypatch.setenv("GENERATE_SHORT_CLIPS_MODEL_NAME", "generate-short-clips-custom")
    monkeypatch.setenv("LLM_BASE_URL", "https://llm.example.test/v1")
    monkeypatch.setenv("LLM_API_KEY", "local-token")
    monkeypatch.setenv("LLM_MODEL_NAME", "Qwen/custom")
    monkeypatch.setenv("LLM_TIMEOUT_SECONDS", "45")
    monkeypatch.setenv("LLM_TEMPERATURE", "0.2")
    monkeypatch.setenv("LLM_MAX_TOKENS", "2048")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_PROVIDER", "sentence-transformers")
    monkeypatch.setenv(
        "GENERATE_CHAPTERS_EMBEDDING_MODEL_NAME", "Qwen/custom-embedding"
    )
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_DEVICE", "cuda")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_BATCH_SIZE", "16")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_MAX_SEQUENCE_LENGTH", "4096")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_CACHE_PATH", "/tmp/qwen-cache")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_LOCAL_FILES_ONLY", "true")
    monkeypatch.setenv("GENERATE_CHAPTERS_TARGET_UNIT_DURATION_SECONDS", "18")
    monkeypatch.setenv("GENERATE_CHAPTERS_MAX_UNIT_DURATION_SECONDS", "25")
    monkeypatch.setenv("GENERATE_CHAPTERS_TARGET_UNIT_WORDS", "70")
    monkeypatch.setenv("GENERATE_CHAPTERS_MAX_UNIT_WORDS", "140")
    monkeypatch.setenv("GENERATE_CHAPTERS_MAX_UNIT_CHARS", "900")
    monkeypatch.setenv("GENERATE_CHAPTERS_PAUSE_BOUNDARY_SECONDS", "1")
    monkeypatch.setenv("GENERATE_CHAPTERS_PUNCTUATION_POOR_THRESHOLD", "0.25")
    monkeypatch.setenv("GENERATE_CHAPTERS_UNIT_REPAIR_SHORT_DURATION_SECONDS", "3")
    monkeypatch.setenv("GENERATE_CHAPTERS_UNIT_REPAIR_MIN_WORDS", "6")
    monkeypatch.setenv("GENERATE_CHAPTERS_UNIT_REPAIR_FRAGMENT_MAX_WORDS", "3")
    monkeypatch.setenv("GENERATE_CHAPTERS_UNIT_REPAIR_SPARSE_DURATION_SECONDS", "5")
    monkeypatch.setenv("GENERATE_CHAPTERS_UNIT_REPAIR_CONTINUATION_GAP_SECONDS", "0.1")
    monkeypatch.setenv("GENERATE_CHAPTERS_CONTEXT_WINDOW_SECONDS", "100")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_SCORE_CONTEXT_SECONDS", "45")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_LONG_PAUSE_SECONDS", "2")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_MAX_PAUSE_SCORE_SECONDS", "4")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_MIN_CONTEXT_TEXT_CHARS", "100")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_DISCOURSE_MARKER_WEIGHT", "0.2")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_PAUSE_WEIGHT", "0.2")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_LEXICAL_SHIFT_WEIGHT", "0.2")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_BOUNDARY_QUALITY_WEIGHT", "0.2")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_DURATION_SANITY_WEIGHT", "0.2")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_CANDIDATE_MIN_LIMIT", "8")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_CANDIDATE_MAX_LIMIT", "120")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_CANDIDATE_MULTIPLIER", "3")
    monkeypatch.setenv("GENERATE_CHAPTERS_CANDIDATE_TOP_SCORE_FRACTION", "0.5")
    monkeypatch.setenv("GENERATE_CHAPTERS_VALLEY_SMOOTHING_RADIUS", "2")
    monkeypatch.setenv("GENERATE_CHAPTERS_VALLEY_PEAK_WINDOW", "4")
    monkeypatch.setenv("GENERATE_CHAPTERS_VALLEY_MIN_DEPTH", "0.3")
    monkeypatch.setenv("GENERATE_CHAPTERS_VALLEY_SEMANTIC_WEIGHT", "0.6")

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
    assert settings.diarization_provider == "pyannote"
    assert settings.pyannote_auth_token == "hf_token"
    assert settings.pyannote_diarization_model == "pyannote/custom"
    assert settings.diarization_device == "cuda"
    assert settings.source_separation_provider == "demucs"
    assert settings.demucs_model == "htdemucs_ft"
    assert settings.demucs_device == "cuda"
    assert str(settings.demucs_output_dir) == "/tmp/custom-demucs"
    assert settings.demucs_jobs == 2
    assert settings.demucs_shifts == 1
    assert settings.demucs_overlap == 0.4
    assert settings.audio_decoder_provider == "torchaudio"
    assert settings.audio_min_sample_rate == 4000
    assert settings.audio_max_sample_rate == 96000
    assert settings.audio_supported_channels == (1, 2, 4)
    assert settings.audio_target_sample_rate == 16000
    assert settings.audio_target_loudness == -18
    assert settings.audio_min_loudness == -80
    assert settings.audio_min_normalize_seconds == 0.5
    assert settings.audio_peak_ceiling == 0.95
    assert settings.audio_wav_pcm_sample_width_bytes == 2
    assert settings.audio_enable_loudness_normalization is False
    assert settings.vad_provider == "silero"
    assert settings.vad_sample_rate == 16000
    assert settings.vad_threshold == 0.6
    assert settings.vad_min_speech_duration_ms == 200
    assert settings.vad_min_silence_duration_ms == 300
    assert settings.vad_speech_pad_ms == 50
    assert settings.vad_use_onnx is True
    assert settings.vad_min_total_speech_ms == 500
    assert settings.vad_min_speech_ratio == 0.05
    assert settings.offline_asr_pad_seconds == 0.2
    assert settings.offline_asr_merge_gap_seconds == 0.4
    assert settings.offline_asr_max_window_seconds == 20
    assert settings.offline_asr_min_window_seconds == 1.5
    assert settings.generate_chapters_strategy == "word"
    assert settings.generate_chapters_model_name == "generate-chapters-v1"
    assert (
        settings.generate_chapters_boundary_evaluation_provider == "openai-compatible"
    )
    assert settings.generate_chapters_title_provider == "openai-compatible"
    assert settings.generate_short_clips_candidate_provider == "openai-compatible"
    assert settings.generate_short_clips_model_name == "generate-short-clips-custom"
    assert settings.llm_base_url == "https://llm.example.test/v1"
    assert settings.llm_api_key == "local-token"
    assert settings.llm_model_name == "Qwen/custom"
    assert settings.llm_timeout_seconds == 45
    assert settings.llm_temperature == 0.2
    assert settings.llm_max_tokens == 2048
    assert settings.generate_chapters_embedding_provider == "sentence-transformers"
    assert settings.generate_chapters_embedding_model_name == "Qwen/custom-embedding"
    assert settings.generate_chapters_embedding_device == "cuda"
    assert settings.generate_chapters_embedding_batch_size == 16
    assert settings.generate_chapters_embedding_max_sequence_length == 4096
    assert str(settings.generate_chapters_embedding_cache_path) == "/tmp/qwen-cache"
    assert settings.generate_chapters_embedding_local_files_only is True
    assert settings.generate_chapters_target_unit_duration_seconds == 18
    assert settings.generate_chapters_max_unit_duration_seconds == 25
    assert settings.generate_chapters_target_unit_words == 70
    assert settings.generate_chapters_max_unit_words == 140
    assert settings.generate_chapters_max_unit_chars == 900
    assert settings.generate_chapters_pause_boundary_seconds == 1
    assert settings.generate_chapters_punctuation_poor_threshold == 0.25
    assert settings.generate_chapters_unit_repair_short_duration_seconds == 3
    assert settings.generate_chapters_unit_repair_min_words == 6
    assert settings.generate_chapters_unit_repair_fragment_max_words == 3
    assert settings.generate_chapters_unit_repair_sparse_duration_seconds == 5
    assert settings.generate_chapters_unit_repair_continuation_gap_seconds == 0.1
    assert settings.generate_chapters_context_window_seconds == 100
    assert settings.generate_chapters_candidate_score_context_seconds == 45
    assert settings.generate_chapters_candidate_long_pause_seconds == 2
    assert settings.generate_chapters_candidate_max_pause_score_seconds == 4
    assert settings.generate_chapters_candidate_min_context_text_chars == 100
    assert settings.generate_chapters_candidate_discourse_marker_weight == 0.2
    assert settings.generate_chapters_candidate_pause_weight == 0.2
    assert settings.generate_chapters_candidate_lexical_shift_weight == 0.2
    assert settings.generate_chapters_candidate_boundary_quality_weight == 0.2
    assert settings.generate_chapters_candidate_duration_sanity_weight == 0.2
    assert settings.generate_chapters_embedding_candidate_min_limit == 8
    assert settings.generate_chapters_embedding_candidate_max_limit == 120
    assert settings.generate_chapters_embedding_candidate_multiplier == 3
    assert settings.generate_chapters_candidate_top_score_fraction == 0.5
    assert settings.generate_chapters_valley_smoothing_radius == 2
    assert settings.generate_chapters_valley_peak_window == 4
    assert settings.generate_chapters_valley_min_depth == 0.3
    assert settings.generate_chapters_valley_semantic_weight == 0.6


def test_settings_reject_invalid_port(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_SERVICE_PORT", "70000")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_treat_empty_model_storage_path_as_none(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ASR_MODEL_STORAGE_PATH", "")
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_CACHE_PATH", "")

    settings = Settings(_env_file=None)

    assert settings.asr_model_storage_path is None
    assert settings.generate_chapters_embedding_cache_path is None


def test_settings_reject_invalid_embedding_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GENERATE_CHAPTERS_EMBEDDING_PROVIDER", "unknown")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_settings_reject_invalid_llm_provider_switches(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GENERATE_SHORT_CLIPS_CANDIDATE_PROVIDER", "unknown")

    with pytest.raises(ValidationError):
        Settings(_env_file=None)
