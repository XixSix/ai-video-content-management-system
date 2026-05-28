from pydantic import BaseModel, ConfigDict


class TranscriptSegmentResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    segment_id: str
    start_seconds: float
    end_seconds: float
    text: str


class TranscriptResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    language: str
    full_text: str
    segments: list[TranscriptSegmentResult]
    asr_model: str
    diarization_model: str = ""
    source_separation_model: str = ""
