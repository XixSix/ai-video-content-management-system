from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TranscriptJobOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    language: Literal["auto", "en"] = "auto"
    generate_srt: bool = Field(
        default=True, validation_alias="generateSrt", serialization_alias="generateSrt"
    )
    generate_vtt: bool = Field(
        default=True, validation_alias="generateVtt", serialization_alias="generateVtt"
    )
    burn_transcript: bool = Field(
        default=False,
        validation_alias="burnTranscript",
        serialization_alias="burnTranscript",
    )
    use_vad: bool = Field(
        default=True, validation_alias="useVad", serialization_alias="useVad"
    )
    source_separation: bool = Field(
        default=False,
        validation_alias="sourceSeparation",
        serialization_alias="sourceSeparation",
    )
    use_diarization: bool = Field(
        default=False,
        validation_alias="useDiarization",
        serialization_alias="useDiarization",
    )


class TranscriptOutputSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: UUID
    language: str | None
    source: Literal["IMPORTED"] = "IMPORTED"
    model: str | None = None
    segment_count: int = Field(
        validation_alias="segmentCount", serialization_alias="segmentCount"
    )
    word_count: int = Field(
        validation_alias="wordCount", serialization_alias="wordCount"
    )
    full_text_preview: str | None = Field(
        validation_alias="fullTextPreview", serialization_alias="fullTextPreview"
    )


class TranscriptAudioOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    duration_seconds: float | None = Field(
        validation_alias="durationSeconds", serialization_alias="durationSeconds"
    )
    sample_rate: int | None = Field(
        validation_alias="sampleRate", serialization_alias="sampleRate"
    )
    channels: int | None
    codec_name: str | None = Field(
        validation_alias="codecName", serialization_alias="codecName"
    )
    silence_ratio: float | None = Field(
        validation_alias="silenceRatio", serialization_alias="silenceRatio"
    )


class TranscriptArtifactsOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    srt_key: str | None = Field(
        default=None, validation_alias="srtKey", serialization_alias="srtKey"
    )
    vtt_key: str | None = Field(
        default=None, validation_alias="vttKey", serialization_alias="vttKey"
    )


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
