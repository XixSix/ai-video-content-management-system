from pathlib import Path

from pydantic import AmqpDsn, Field, PositiveInt

from pydantic_settings import BaseSettings, SettingsConfigDict

WORKER_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=WORKER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    rabbitmq_url: AmqpDsn = Field(alias="RABBITMQ_URL")
    transcript_queue_name: str = Field(
        default="transcript_queue",
        alias="TRANSCRIPT_QUEUE_NAME",
    )
    transcript_task_name: str = Field(
        default="transcript_task",
        alias="TRANSCRIPT_TASK_NAME",
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

    database_url: str = Field(alias="DATABASE_URL")
    database_pool_size: PositiveInt = Field(default=5, alias="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=5, ge=0, alias="DATABASE_MAX_OVERFLOW")
    database_pool_recycle_seconds: PositiveInt = Field(
        default=1800,
        alias="DATABASE_POOL_RECYCLE_SECONDS",
    )

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

    ffmpeg_binary: str = Field(default="ffmpeg", alias="FFMPEG_BINARY")
    ffprobe_binary: str = Field(default="ffprobe", alias="FFPROBE_BINARY")
    ffmpeg_timeout_seconds: PositiveInt = Field(default=1800, alias="FFMPEG_TIMEOUT_SECONDS")
    audio_sample_rate: PositiveInt = Field(default=16000, alias="AUDIO_SAMPLE_RATE")
    audio_channels: PositiveInt = Field(default=1, alias="AUDIO_CHANNELS")


settings = Settings()
