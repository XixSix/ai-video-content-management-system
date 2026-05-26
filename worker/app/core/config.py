from pydantic import (
    AmqpDsn,
)

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    BROKER_URL: AmqpDsn
    S3_ENDPOINT: str
    S3_PUBLIC_ENDPOINT: str = "http://localhost:9000"
    S3_REGION: str = "ap-southeast-1"
    S3_BUCKET: str
    S3_ACCESS_KEY_ID: str
    S3_SECRET_ACCESS_KEY: str
    S3_FORCE_PATH_STYLE: bool = True
    TMP_DIR: str = "/tmp/audio"


settings = Settings(_env_file=".env", _env_file_encoding="utf-8")
