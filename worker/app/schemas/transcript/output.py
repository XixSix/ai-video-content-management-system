from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TranscriptJobOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    language: Literal["vi", "auto"] = "auto"
    generate_srt: bool = Field(default=True, alias="generateSrt")
    generate_vtt: bool = Field(default=True, alias="generateVtt")
    burn_transcript: bool = Field(default=False, alias="burnTranscript")
    use_vad: bool = Field(default=True, alias="useVad")
    source_separation: bool = Field(default=False, alias="sourceSeparation")
    use_diarization: bool = Field(default=False, alias="useDiarization")


class TranscriptOutputSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: UUID
    language: str | None
    source: Literal["IMPORTED"] = "IMPORTED"
    model: Literal["worker-placeholder-transcriber-v1"] = (
        "worker-placeholder-transcriber-v1"
    )
    segment_count: int = Field(alias="segmentCount")
    word_count: int = Field(alias="wordCount")
    full_text_preview: str | None = Field(alias="fullTextPreview")


class TranscriptAudioOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    duration_seconds: float | None = Field(alias="durationSeconds")
    sample_rate: int | None = Field(alias="sampleRate")
    channels: int | None
    codec_name: str | None = Field(alias="codecName")
    silence_ratio: float | None = Field(alias="silenceRatio")


class TranscriptArtifactsOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    srt_key: str | None = Field(default=None, alias="srtKey")
    vtt_key: str | None = Field(default=None, alias="vttKey")


class TranscriptCompletedOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["transcript.completed"] = "transcript.completed"
    version: Literal[1] = 1
    transcript: TranscriptOutputSummary
    audio: TranscriptAudioOutput
    artifacts: TranscriptArtifactsOutput = Field(
        default_factory=TranscriptArtifactsOutput
    )
    options: TranscriptJobOptions
