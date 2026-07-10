from pathlib import Path

from pydantic import BaseModel, ConfigDict


class TranscribeOptionsInput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    language: str | None = None
    enable_vad: bool = False
    enable_diarization: bool = False
    enable_source_separation: bool = False
    enable_word_timestamps: bool = False


class TranscribeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    local_path: Path
    options: TranscribeOptionsInput = TranscribeOptionsInput()
