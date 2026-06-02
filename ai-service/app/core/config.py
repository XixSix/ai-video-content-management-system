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
    chaptering_model_name: str = Field(
        default="rule-based-chaptering-v1",
        alias="CHAPTERING_MODEL_NAME",
    )
    chaptering_max_unit_duration_seconds: PositiveFloat = Field(
        default=30.0,
        alias="CHAPTERING_MAX_UNIT_DURATION_SECONDS",
    )
    chaptering_pause_boundary_seconds: PositiveFloat = Field(
        default=1.0,
        alias="CHAPTERING_PAUSE_BOUNDARY_SECONDS",
    )
    chaptering_context_window_seconds: PositiveFloat = Field(
        default=90.0,
        alias="CHAPTERING_CONTEXT_WINDOW_SECONDS",
    )
    chaptering_candidate_score_context_seconds: PositiveFloat = Field(
        default=90.0,
        alias="CHAPTERING_CANDIDATE_SCORE_CONTEXT_SECONDS",
    )
    chaptering_candidate_long_pause_seconds: PositiveFloat = Field(
        default=1.0,
        alias="CHAPTERING_CANDIDATE_LONG_PAUSE_SECONDS",
    )
    chaptering_candidate_max_pause_score_seconds: PositiveFloat = Field(
        default=5.0,
        alias="CHAPTERING_CANDIDATE_MAX_PAUSE_SCORE_SECONDS",
    )
    chaptering_candidate_min_context_text_chars: PositiveInt = Field(
        default=120,
        alias="CHAPTERING_CANDIDATE_MIN_CONTEXT_TEXT_CHARS",
    )
    chaptering_candidate_discourse_marker_weight: float = Field(
        default=0.30,
        ge=0.0,
        alias="CHAPTERING_CANDIDATE_DISCOURSE_MARKER_WEIGHT",
    )
    chaptering_candidate_pause_weight: float = Field(
        default=0.25,
        ge=0.0,
        alias="CHAPTERING_CANDIDATE_PAUSE_WEIGHT",
    )
    chaptering_candidate_lexical_shift_weight: float = Field(
        default=0.20,
        ge=0.0,
        alias="CHAPTERING_CANDIDATE_LEXICAL_SHIFT_WEIGHT",
    )
    chaptering_candidate_boundary_quality_weight: float = Field(
        default=0.15,
        ge=0.0,
        alias="CHAPTERING_CANDIDATE_BOUNDARY_QUALITY_WEIGHT",
    )
    chaptering_candidate_duration_sanity_weight: float = Field(
        default=0.10,
        ge=0.0,
        alias="CHAPTERING_CANDIDATE_DURATION_SANITY_WEIGHT",
    )
    chaptering_embedding_candidate_min_limit: PositiveInt = Field(
        default=12,
        alias="CHAPTERING_EMBEDDING_CANDIDATE_MIN_LIMIT",
    )
    chaptering_embedding_candidate_max_limit: PositiveInt = Field(
        default=40,
        alias="CHAPTERING_EMBEDDING_CANDIDATE_MAX_LIMIT",
    )
    chaptering_embedding_candidate_multiplier: PositiveInt = Field(
        default=4,
        alias="CHAPTERING_EMBEDDING_CANDIDATE_MULTIPLIER",
    )
    chaptering_candidate_top_score_fraction: float = Field(
        default=0.60,
        ge=0.0,
        le=1.0,
        alias="CHAPTERING_CANDIDATE_TOP_SCORE_FRACTION",
    )

    @property
    def bind_address(self) -> str:
        return f"{self.ai_service_host}:{self.ai_service_port}"

    @field_validator("asr_model_storage_path", mode="before")
    @classmethod
    def empty_model_storage_path_as_none(cls, value: object) -> object:
        if value == "":
            return None

        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
