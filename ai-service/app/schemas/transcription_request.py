from pathlib import Path

from pydantic import BaseModel, ConfigDict


class TranscriptionOptionsInput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    language: str | None = None
    enable_vad: bool = False
    enable_diarization: bool = False
    enable_source_separation: bool = False


class TranscriptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    local_path: Path | None
    filename: str = ""
    content_type: str = ""
    options: TranscriptionOptionsInput = TranscriptionOptionsInput()
