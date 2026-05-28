from pathlib import Path

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

    @property
    def bind_address(self) -> str:
        return f"{self.ai_service_host}:{self.ai_service_port}"


settings = Settings()
