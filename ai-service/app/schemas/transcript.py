from pydantic import BaseModel, ConfigDict, Field


class TranscriptWordResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    word_id: str
    start_seconds: float
    end_seconds: float
    text: str
    confidence: float | None = None


class TranscriptSegmentResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    segment_id: str
    start_seconds: float
    end_seconds: float
    text: str
    words: list[TranscriptWordResult] = Field(default_factory=list)


class TranscriptResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    language: str
    full_text: str
    segments: list[TranscriptSegmentResult]
    asr_model: str
    diarization_model: str = ""
    source_separation_model: str = ""
