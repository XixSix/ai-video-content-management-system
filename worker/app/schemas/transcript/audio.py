from pathlib import Path

from pydantic import BaseModel, ConfigDict


class AudioMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    path: Path
    duration_seconds: float | None
    sample_rate: int | None
    channels: int | None
    codec_name: str | None


class AudioSanityResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    metadata: AudioMetadata
    silence_ratio: float
