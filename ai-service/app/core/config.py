from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, PositiveInt
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

    @property
    def bind_address(self) -> str:
        return f"{self.ai_service_host}:{self.ai_service_port}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
