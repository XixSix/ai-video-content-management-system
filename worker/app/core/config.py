from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AmqpDsn, Field, PositiveFloat, PositiveInt
from pydantic_settings import BaseSettings, SettingsConfigDict

WORKER_DIR = Path(__file__).resolve().parents[2]


class _DatabaseSettings:
    database_url: str = Field(alias="DATABASE_URL")
    database_pool_size: PositiveInt = Field(default=5, alias="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=5, ge=0, alias="DATABASE_MAX_OVERFLOW")
    database_pool_recycle_seconds: PositiveInt = Field(
        default=1800,
        alias="DATABASE_POOL_RECYCLE_SECONDS",
    )


class _CeleryAppSettings:
    rabbitmq_url: AmqpDsn = Field(alias="RABBITMQ_URL")
    transcript_queue_name: str = Field(
        default="transcript_queue",
        alias="TRANSCRIPT_QUEUE_NAME",
    )
    transcript_task_name: str = Field(
        default="transcript_task",
        alias="TRANSCRIPT_TASK_NAME",
    )
    chaptering_queue_name: str = Field(
        default="chaptering_queue",
        alias="CHAPTERING_QUEUE_NAME",
    )
    chaptering_task_name: str = Field(
        default="chaptering_task",
        alias="CHAPTERING_TASK_NAME",
    )
    worker_concurrency: PositiveInt = Field(default=1, alias="WORKER_CONCURRENCY")
    worker_prefetch_multiplier: PositiveInt = Field(
        default=1,
        alias="WORKER_PREFETCH_MULTIPLIER",
    )
    worker_max_tasks_per_child: PositiveInt = Field(
        default=20,
        alias="WORKER_MAX_TASKS_PER_CHILD",
    )
    task_max_retries: int = Field(default=3, ge=0, alias="TASK_MAX_RETRIES")
    task_default_retry_delay_seconds: PositiveInt = Field(
        default=30,
        alias="TASK_DEFAULT_RETRY_DELAY_SECONDS",
    )
    task_soft_time_limit_seconds: PositiveInt = Field(
        default=3600,
        alias="TASK_SOFT_TIME_LIMIT_SECONDS",
    )
    task_time_limit_seconds: PositiveInt = Field(
        default=3900,
        alias="TASK_TIME_LIMIT_SECONDS",
    )
    broker_heartbeat_seconds: PositiveInt = Field(
        default=30,
        alias="BROKER_HEARTBEAT_SECONDS",
    )


class _StorageSettings:
    s3_endpoint: str = Field(alias="S3_ENDPOINT")
    s3_public_endpoint: str = Field(
        default="http://localhost:9000",
        alias="S3_PUBLIC_ENDPOINT",
    )
    s3_region: str = Field(default="ap-southeast-1", alias="S3_REGION")
    s3_bucket: str = Field(alias="S3_BUCKET")
    s3_access_key_id: str = Field(alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: str = Field(alias="S3_SECRET_ACCESS_KEY")
    s3_force_path_style: bool = Field(default=True, alias="S3_FORCE_PATH_STYLE")
    tmp_dir: Path = Field(default=Path("/tmp/avcms-worker"), alias="TMP_DIR")
    storage_dir: Path = Field(
        default=WORKER_DIR / "app" / "storage",
        alias="STORAGE_DIR",
    )


class _FfmpegSettings:
    ffmpeg_binary: str = Field(default="ffmpeg", alias="FFMPEG_BINARY")
    ffprobe_binary: str = Field(default="ffprobe", alias="FFPROBE_BINARY")
    ffmpeg_timeout_seconds: PositiveInt = Field(
        default=1800, alias="FFMPEG_TIMEOUT_SECONDS"
    )
    audio_sample_rate: PositiveInt = Field(default=16000, alias="AUDIO_SAMPLE_RATE")
    audio_channels: PositiveInt = Field(default=1, alias="AUDIO_CHANNELS")


class _AiServiceGrpcSettings:
    ai_service_grpc_target: str = Field(
        default="localhost:50051",
        alias="AI_SERVICE_GRPC_TARGET",
    )
    ai_service_grpc_timeout_seconds: PositiveInt = Field(
        default=1800,
        alias="AI_SERVICE_GRPC_TIMEOUT_SECONDS",
    )


class _ChapteringPipelineSettings:
    chaptering_pipeline_strategy: Literal["candidate", "rule_based"] = Field(
        default="candidate",
        alias="CHAPTERING_PIPELINE_STRATEGY",
    )
    chaptering_max_unit_duration_seconds: PositiveFloat = Field(
        default=30.0,
        alias="CHAPTERING_MAX_UNIT_DURATION_SECONDS",
    )
    chaptering_pause_boundary_seconds: PositiveFloat = Field(
        default=1.2,
        alias="CHAPTERING_PAUSE_BOUNDARY_SECONDS",
    )
    chaptering_context_window_seconds: PositiveFloat = Field(
        default=90.0,
        alias="CHAPTERING_CONTEXT_WINDOW_SECONDS",
    )
    chaptering_candidate_score_context_seconds: PositiveFloat = Field(
        default=60.0,
        alias="CHAPTERING_CANDIDATE_SCORE_CONTEXT_SECONDS",
    )
    chaptering_candidate_long_pause_seconds: PositiveFloat = Field(
        default=1.2,
        alias="CHAPTERING_CANDIDATE_LONG_PAUSE_SECONDS",
    )
    chaptering_candidate_max_pause_score_seconds: PositiveFloat = Field(
        default=3.0,
        alias="CHAPTERING_CANDIDATE_MAX_PAUSE_SCORE_SECONDS",
    )
    chaptering_candidate_min_context_text_chars: PositiveInt = Field(
        default=120,
        alias="CHAPTERING_CANDIDATE_MIN_CONTEXT_TEXT_CHARS",
    )
    chaptering_embedding_candidate_min_limit: PositiveInt = Field(
        default=80,
        alias="CHAPTERING_EMBEDDING_CANDIDATE_MIN_LIMIT",
    )
    chaptering_embedding_candidate_max_limit: PositiveInt = Field(
        default=150,
        alias="CHAPTERING_EMBEDDING_CANDIDATE_MAX_LIMIT",
    )
    chaptering_embedding_candidate_multiplier: PositiveInt = Field(
        default=10,
        alias="CHAPTERING_EMBEDDING_CANDIDATE_MULTIPLIER",
    )
    chaptering_candidate_top_score_fraction: float = Field(
        default=0.70,
        gt=0.0,
        le=1.0,
        alias="CHAPTERING_CANDIDATE_TOP_SCORE_FRACTION",
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


class _LoggingSettings:
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")


class Settings(
    _CeleryAppSettings,
    _ChapteringPipelineSettings,
    _DatabaseSettings,
    _FfmpegSettings,
    _AiServiceGrpcSettings,
    _LoggingSettings,
    _StorageSettings,
    BaseSettings,
):
    model_config = SettingsConfigDict(
        env_file=WORKER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # pyright: ignore[reportCallIssue]


settings = get_settings()
