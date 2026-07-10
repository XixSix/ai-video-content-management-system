from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, PositiveFloat, PositiveInt, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AI_SERVICE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=AI_SERVICE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    ai_service_host: str = Field(default="0.0.0.0", alias="AI_SERVICE_HOST")
    ai_service_port: int = Field(default=50051, ge=1, le=65535, alias="AI_SERVICE_PORT")
    ai_service_max_workers: PositiveInt = Field(
        default=4,
        alias="AI_SERVICE_MAX_WORKERS",
    )
    asr_provider: Literal["noop", "faster-whisper"] = Field(
        default="noop",
        alias="ASR_PROVIDER",
    )
    asr_language: str = Field(default="en", alias="ASR_LANGUAGE")
    asr_model_size: str = Field(default="small", alias="ASR_MODEL_SIZE")
    asr_device: str = Field(default="cpu", alias="ASR_DEVICE")
    asr_compute_type: str = Field(default="int8", alias="ASR_COMPUTE_TYPE")
    asr_cpu_threads: PositiveInt = Field(default=4, alias="ASR_CPU_THREADS")
    asr_num_workers: PositiveInt = Field(default=1, alias="ASR_NUM_WORKERS")
    asr_model_storage_path: Path | None = Field(
        default=None,
        alias="ASR_MODEL_STORAGE_PATH",
    )
    asr_local_files_only: bool = Field(default=False, alias="ASR_LOCAL_FILES_ONLY")
    diarization_provider: Literal["noop", "pyannote"] = Field(
        default="noop",
        alias="DIARIZATION_PROVIDER",
    )
    pyannote_auth_token: str = Field(default="", alias="PYANNOTE_AUTH_TOKEN")
    pyannote_diarization_model: str = Field(
        default="pyannote/speaker-diarization-community-1",
        alias="PYANNOTE_DIARIZATION_MODEL",
    )
    diarization_device: str = Field(default="cpu", alias="DIARIZATION_DEVICE")
    source_separation_provider: Literal["noop", "demucs"] = Field(
        default="noop",
        alias="SOURCE_SEPARATION_PROVIDER",
    )
    demucs_model: str = Field(default="htdemucs", alias="DEMUCS_MODEL")
    demucs_device: str = Field(default="cpu", alias="DEMUCS_DEVICE")
    demucs_output_dir: Path = Field(
        default=Path("/tmp/vid-pilot-demucs"),
        alias="DEMUCS_OUTPUT_DIR",
    )
    demucs_jobs: PositiveInt = Field(default=1, alias="DEMUCS_JOBS")
    demucs_shifts: int = Field(default=0, ge=0, alias="DEMUCS_SHIFTS")
    demucs_overlap: float = Field(
        default=0.25,
        ge=0.0,
        le=1.0,
        alias="DEMUCS_OVERLAP",
    )
    audio_decoder_provider: Literal["noop", "torchaudio"] = Field(
        default="noop",
        alias="AUDIO_DECODER_PROVIDER",
    )
    audio_min_sample_rate: PositiveInt = Field(
        default=8_000,
        alias="AUDIO_MIN_SAMPLE_RATE",
    )
    audio_max_sample_rate: PositiveInt = Field(
        default=192_000,
        alias="AUDIO_MAX_SAMPLE_RATE",
    )
    audio_supported_channels: tuple[int, ...] = Field(
        default=(1, 2),
        alias="AUDIO_SUPPORTED_CHANNELS",
    )
    audio_target_sample_rate: PositiveInt = Field(
        default=16_000,
        alias="AUDIO_TARGET_SAMPLE_RATE",
    )
    audio_target_loudness: float = Field(
        default=-16.0,
        alias="AUDIO_TARGET_LOUDNESS",
    )
    audio_min_loudness: float = Field(
        default=-70.0,
        alias="AUDIO_MIN_LOUDNESS",
    )
    audio_min_normalize_seconds: PositiveFloat = Field(
        default=0.4,
        alias="AUDIO_MIN_NORMALIZE_SECONDS",
    )
    audio_peak_ceiling: float = Field(
        default=0.98,
        gt=0.0,
        le=1.0,
        alias="AUDIO_PEAK_CEILING",
    )
    audio_wav_pcm_sample_width_bytes: PositiveInt = Field(
        default=2,
        alias="AUDIO_WAV_PCM_SAMPLE_WIDTH_BYTES",
    )
    audio_enable_loudness_normalization: bool = Field(
        default=True,
        alias="AUDIO_ENABLE_LOUDNESS_NORMALIZATION",
    )
    vad_provider: Literal["noop", "silero"] = Field(
        default="noop",
        alias="VAD_PROVIDER",
    )
    vad_sample_rate: PositiveInt = Field(
        default=16_000,
        alias="VAD_SAMPLE_RATE",
    )
    vad_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        alias="VAD_THRESHOLD",
    )
    vad_min_speech_duration_ms: PositiveInt = Field(
        default=250,
        alias="VAD_MIN_SPEECH_DURATION_MS",
    )
    vad_min_silence_duration_ms: PositiveInt = Field(
        default=100,
        alias="VAD_MIN_SILENCE_DURATION_MS",
    )
    vad_speech_pad_ms: int = Field(
        default=30,
        ge=0,
        alias="VAD_SPEECH_PAD_MS",
    )
    vad_use_onnx: bool = Field(
        default=False,
        alias="VAD_USE_ONNX",
    )
    vad_min_total_speech_ms: float = Field(
        default=250.0,
        ge=0.0,
        alias="VAD_MIN_TOTAL_SPEECH_MS",
    )
    vad_min_speech_ratio: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        alias="VAD_MIN_SPEECH_RATIO",
    )
    offline_asr_pad_seconds: float = Field(
        default=0.25,
        ge=0.0,
        alias="OFFLINE_ASR_PAD_SECONDS",
    )
    offline_asr_merge_gap_seconds: float = Field(
        default=0.6,
        ge=0.0,
        alias="OFFLINE_ASR_MERGE_GAP_SECONDS",
    )
    offline_asr_max_window_seconds: PositiveFloat = Field(
        default=30.0,
        alias="OFFLINE_ASR_MAX_WINDOW_SECONDS",
    )
    offline_asr_min_window_seconds: PositiveFloat = Field(
        default=1.2,
        alias="OFFLINE_ASR_MIN_WINDOW_SECONDS",
    )
    generate_chapters_strategy: Literal["segment", "word"] = Field(
        default="segment",
        alias="GENERATE_CHAPTERS_STRATEGY",
    )
    generate_chapters_model_name: str = Field(
        default="segment-generate-chapters-v1",
        alias="GENERATE_CHAPTERS_MODEL_NAME",
    )
    generate_chapters_boundary_evaluation_provider: Literal[
        "noop",
        "openai-compatible",
    ] = Field(
        default="noop",
        alias="GENERATE_CHAPTERS_BOUNDARY_EVALUATION_PROVIDER",
    )
    generate_chapters_title_provider: Literal["noop", "openai-compatible"] = Field(
        default="noop",
        alias="GENERATE_CHAPTERS_TITLE_PROVIDER",
    )
    generate_short_clips_candidate_provider: Literal[
        "noop",
        "openai-compatible",
    ] = Field(
        default="noop",
        alias="GENERATE_SHORT_CLIPS_CANDIDATE_PROVIDER",
    )
    generate_short_clips_model_name: str = Field(
        default="noop-generate-short-clips-v1",
        min_length=1,
        alias="GENERATE_SHORT_CLIPS_MODEL_NAME",
    )
    llm_base_url: str = Field(
        default="http://localhost:8000/v1",
        min_length=1,
        alias="LLM_BASE_URL",
    )
    llm_api_key: str = Field(default="", alias="LLM_API_KEY")
    llm_model_name: str = Field(
        default="Qwen/Qwen3-8B",
        min_length=1,
        alias="LLM_MODEL_NAME",
    )
    llm_timeout_seconds: PositiveFloat = Field(
        default=30.0,
        alias="LLM_TIMEOUT_SECONDS",
    )
    llm_temperature: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
        alias="LLM_TEMPERATURE",
    )
    llm_max_tokens: PositiveInt = Field(default=1024, alias="LLM_MAX_TOKENS")
    generate_chapters_embedding_provider: Literal["noop", "sentence-transformers"] = (
        Field(
            default="noop",
            alias="GENERATE_CHAPTERS_EMBEDDING_PROVIDER",
        )
    )
    generate_chapters_embedding_model_name: str = Field(
        default="Qwen/Qwen3-Embedding-0.6B",
        min_length=1,
        alias="GENERATE_CHAPTERS_EMBEDDING_MODEL_NAME",
    )
    generate_chapters_embedding_device: str = Field(
        default="cpu",
        min_length=1,
        alias="GENERATE_CHAPTERS_EMBEDDING_DEVICE",
    )
    generate_chapters_embedding_batch_size: PositiveInt = Field(
        default=8,
        alias="GENERATE_CHAPTERS_EMBEDDING_BATCH_SIZE",
    )
    generate_chapters_embedding_max_sequence_length: int = Field(
        default=2048,
        ge=1,
        le=32_768,
        alias="GENERATE_CHAPTERS_EMBEDDING_MAX_SEQUENCE_LENGTH",
    )
    generate_chapters_embedding_cache_path: Path | None = Field(
        default=None,
        alias="GENERATE_CHAPTERS_EMBEDDING_CACHE_PATH",
    )
    generate_chapters_embedding_local_files_only: bool = Field(
        default=False,
        alias="GENERATE_CHAPTERS_EMBEDDING_LOCAL_FILES_ONLY",
    )
    generate_chapters_target_unit_duration_seconds: PositiveFloat = Field(
        default=12.0,
        alias="GENERATE_CHAPTERS_TARGET_UNIT_DURATION_SECONDS",
    )
    generate_chapters_max_unit_duration_seconds: PositiveFloat = Field(
        default=20.0,
        alias="GENERATE_CHAPTERS_MAX_UNIT_DURATION_SECONDS",
    )
    generate_chapters_target_unit_words: PositiveInt = Field(
        default=40,
        alias="GENERATE_CHAPTERS_TARGET_UNIT_WORDS",
    )
    generate_chapters_max_unit_words: PositiveInt = Field(
        default=80,
        alias="GENERATE_CHAPTERS_MAX_UNIT_WORDS",
    )
    generate_chapters_max_unit_chars: PositiveInt = Field(
        default=1200,
        alias="GENERATE_CHAPTERS_MAX_UNIT_CHARS",
    )
    generate_chapters_pause_boundary_seconds: PositiveFloat = Field(
        default=1.0,
        alias="GENERATE_CHAPTERS_PAUSE_BOUNDARY_SECONDS",
    )
    generate_chapters_punctuation_poor_threshold: float = Field(
        default=0.15,
        ge=0.0,
        le=1.0,
        alias="GENERATE_CHAPTERS_PUNCTUATION_POOR_THRESHOLD",
    )
    generate_chapters_unit_repair_short_duration_seconds: PositiveFloat = Field(
        default=4.0,
        alias="GENERATE_CHAPTERS_UNIT_REPAIR_SHORT_DURATION_SECONDS",
    )
    generate_chapters_unit_repair_min_words: PositiveInt = Field(
        default=8,
        alias="GENERATE_CHAPTERS_UNIT_REPAIR_MIN_WORDS",
    )
    generate_chapters_unit_repair_fragment_max_words: PositiveInt = Field(
        default=2,
        alias="GENERATE_CHAPTERS_UNIT_REPAIR_FRAGMENT_MAX_WORDS",
    )
    generate_chapters_unit_repair_sparse_duration_seconds: PositiveFloat = Field(
        default=6.0,
        alias="GENERATE_CHAPTERS_UNIT_REPAIR_SPARSE_DURATION_SECONDS",
    )
    generate_chapters_unit_repair_continuation_gap_seconds: PositiveFloat = Field(
        default=0.05,
        alias="GENERATE_CHAPTERS_UNIT_REPAIR_CONTINUATION_GAP_SECONDS",
    )
    generate_chapters_context_window_seconds: PositiveFloat = Field(
        default=90.0,
        alias="GENERATE_CHAPTERS_CONTEXT_WINDOW_SECONDS",
    )
    generate_chapters_candidate_score_context_seconds: PositiveFloat = Field(
        default=90.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_SCORE_CONTEXT_SECONDS",
    )
    generate_chapters_candidate_long_pause_seconds: PositiveFloat = Field(
        default=1.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_LONG_PAUSE_SECONDS",
    )
    generate_chapters_candidate_max_pause_score_seconds: PositiveFloat = Field(
        default=5.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_MAX_PAUSE_SCORE_SECONDS",
    )
    generate_chapters_candidate_min_context_text_chars: PositiveInt = Field(
        default=120,
        alias="GENERATE_CHAPTERS_CANDIDATE_MIN_CONTEXT_TEXT_CHARS",
    )
    generate_chapters_candidate_discourse_marker_weight: float = Field(
        default=0.30,
        ge=0.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_DISCOURSE_MARKER_WEIGHT",
    )
    generate_chapters_candidate_pause_weight: float = Field(
        default=0.25,
        ge=0.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_PAUSE_WEIGHT",
    )
    generate_chapters_candidate_lexical_shift_weight: float = Field(
        default=0.20,
        ge=0.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_LEXICAL_SHIFT_WEIGHT",
    )
    generate_chapters_candidate_boundary_quality_weight: float = Field(
        default=0.15,
        ge=0.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_BOUNDARY_QUALITY_WEIGHT",
    )
    generate_chapters_candidate_duration_sanity_weight: float = Field(
        default=0.10,
        ge=0.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_DURATION_SANITY_WEIGHT",
    )
    generate_chapters_embedding_candidate_min_limit: PositiveInt = Field(
        default=12,
        alias="GENERATE_CHAPTERS_EMBEDDING_CANDIDATE_MIN_LIMIT",
    )
    generate_chapters_embedding_candidate_max_limit: PositiveInt = Field(
        default=40,
        alias="GENERATE_CHAPTERS_EMBEDDING_CANDIDATE_MAX_LIMIT",
    )
    generate_chapters_embedding_candidate_multiplier: PositiveInt = Field(
        default=4,
        alias="GENERATE_CHAPTERS_EMBEDDING_CANDIDATE_MULTIPLIER",
    )
    generate_chapters_candidate_top_score_fraction: float = Field(
        default=0.60,
        ge=0.0,
        le=1.0,
        alias="GENERATE_CHAPTERS_CANDIDATE_TOP_SCORE_FRACTION",
    )
    generate_chapters_valley_smoothing_radius: int = Field(
        default=1,
        ge=0,
        alias="GENERATE_CHAPTERS_VALLEY_SMOOTHING_RADIUS",
    )
    generate_chapters_valley_peak_window: PositiveInt = Field(
        default=2,
        alias="GENERATE_CHAPTERS_VALLEY_PEAK_WINDOW",
    )
    generate_chapters_valley_min_depth: float = Field(
        default=0.18,
        ge=0.0,
        alias="GENERATE_CHAPTERS_VALLEY_MIN_DEPTH",
    )
    generate_chapters_valley_semantic_weight: float = Field(
        default=0.70,
        ge=0.0,
        le=1.0,
        alias="GENERATE_CHAPTERS_VALLEY_SEMANTIC_WEIGHT",
    )

    @property
    def bind_address(self) -> str:
        return f"{self.ai_service_host}:{self.ai_service_port}"

    @field_validator(
        "asr_model_storage_path",
        "generate_chapters_embedding_cache_path",
        mode="before",
    )
    @classmethod
    def empty_optional_path_as_none(cls, value: object) -> object:
        if value == "":
            return None

        return value

    @field_validator("audio_supported_channels", mode="before")
    @classmethod
    def parse_audio_supported_channels(cls, value: object) -> object:
        if value == "":
            return (1, 2)

        if isinstance(value, str):
            return tuple(int(part.strip()) for part in value.split(",") if part.strip())

        if isinstance(value, list):
            return tuple(value)

        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
