from functools import lru_cache
from pathlib import Path
from pydantic import AmqpDsn, Field, PositiveInt
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
    media_previews_queue_name: str = Field(
        default="media_previews_queue",
        alias="MEDIA_PREVIEWS_QUEUE_NAME",
    )
    media_preview_task_name: str = Field(
        default="media_preview_task",
        alias="MEDIA_PREVIEW_TASK_NAME",
    )
    render_exports_queue_name: str = Field(
        default="render_exports_queue",
        alias="RENDER_EXPORTS_QUEUE_NAME",
    )
    render_export_task_name: str = Field(
        default="render_export_task",
        alias="RENDER_EXPORT_TASK_NAME",
    )
    publish_queue_name: str = Field(
        default="publish_queue",
        alias="PUBLISH_QUEUE_NAME",
    )
    publish_task_name: str = Field(
        default="publish_task",
        alias="PUBLISH_TASK_NAME",
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
    tmp_dir: Path = Field(default=Path("/tmp/vidpilot-worker"), alias="TMP_DIR")
    storage_dir: Path = Field(
        default=WORKER_DIR / "app" / "storage",
        alias="STORAGE_DIR",
    )


class _RendererSettings:
    renderer_dir: Path = Field(
        default=WORKER_DIR.parent / "renderer",
        alias="RENDERER_DIR",
    )
    renderer_npm_binary: str = Field(default="npm", alias="RENDERER_NPM_BINARY")
    renderer_timeout_seconds: PositiveInt = Field(
        default=3600,
        alias="RENDERER_TIMEOUT_SECONDS",
    )


class _FfmpegSettings:
    ffmpeg_binary: str = Field(default="ffmpeg", alias="FFMPEG_BINARY")
    ffprobe_binary: str = Field(default="ffprobe", alias="FFPROBE_BINARY")
    ffmpeg_timeout_seconds: PositiveInt = Field(
        default=1800, alias="FFMPEG_TIMEOUT_SECONDS"
    )
    audio_sample_rate: PositiveInt = Field(default=16000, alias="AUDIO_SAMPLE_RATE")
    audio_channels: PositiveInt = Field(default=1, alias="AUDIO_CHANNELS")
    thumbnail_candidate_count: PositiveInt = Field(
        default=12, alias="THUMBNAIL_CANDIDATE_COUNT"
    )
    thumbnail_max_width: PositiveInt = Field(default=640, alias="THUMBNAIL_MAX_WIDTH")
    thumbnail_jpeg_quality: int = Field(
        default=85, ge=1, le=95, alias="THUMBNAIL_JPEG_QUALITY"
    )
    sprite_frame_width: PositiveInt = Field(default=160, alias="SPRITE_FRAME_WIDTH")
    sprite_frame_height: PositiveInt = Field(default=90, alias="SPRITE_FRAME_HEIGHT")
    sprite_columns: PositiveInt = Field(default=10, alias="SPRITE_COLUMNS")
    sprite_frames_per_sheet: PositiveInt = Field(
        default=100, alias="SPRITE_FRAMES_PER_SHEET"
    )
    sprite_min_frames: PositiveInt = Field(default=20, alias="SPRITE_MIN_FRAMES")
    sprite_max_frames: PositiveInt = Field(default=2000, alias="SPRITE_MAX_FRAMES")
    sprite_jpeg_quality: int = Field(
        default=85, ge=1, le=95, alias="SPRITE_JPEG_QUALITY"
    )
    waveform_sample_rate: PositiveInt = Field(
        default=8000, alias="WAVEFORM_SAMPLE_RATE"
    )
    waveform_bins_per_second: PositiveInt = Field(
        default=20, alias="WAVEFORM_BINS_PER_SECOND"
    )
    waveform_max_bins: PositiveInt = Field(default=100000, alias="WAVEFORM_MAX_BINS")


class _AiServiceGrpcSettings:
    ai_service_grpc_target: str = Field(
        default="localhost:50051",
        alias="AI_SERVICE_GRPC_TARGET",
    )
    ai_service_grpc_timeout_seconds: PositiveInt = Field(
        default=1800,
        alias="AI_SERVICE_GRPC_TIMEOUT_SECONDS",
    )


class _LoggingSettings:
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")


class Settings(
    _CeleryAppSettings,
    _DatabaseSettings,
    _FfmpegSettings,
    _AiServiceGrpcSettings,
    _LoggingSettings,
    _RendererSettings,
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
