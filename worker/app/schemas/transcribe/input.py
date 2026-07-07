from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TranscribeLanguage = Literal["auto", "vi", "en"]
VADSensitivity = Literal["low", "medium", "high"]
SourceSeparationMode = Literal["vocals_only", "vocals_and_background"]


class VADOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    enabled: bool = True
    sensitivity: VADSensitivity = "medium"


class DiarizationOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    enabled: bool = False
    num_speakers: int | None = Field(
        default=None,
        validation_alias="numSpeakers",
        serialization_alias="numSpeakers",
    )
    min_speakers: int | None = Field(
        default=None,
        validation_alias="minSpeakers",
        serialization_alias="minSpeakers",
    )
    max_speakers: int | None = Field(
        default=None,
        validation_alias="maxSpeakers",
        serialization_alias="maxSpeakers",
    )


class SourceSeparationOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    enabled: bool = False
    mode: SourceSeparationMode = "vocals_only"


class WordTimestampsOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    enabled: bool = True


class TranscribeOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    language: TranscribeLanguage = "en"
    vad: VADOptions = Field(default_factory=VADOptions)
    diarization: DiarizationOptions = Field(default_factory=DiarizationOptions)
    source_separation: SourceSeparationOptions = Field(
        default_factory=SourceSeparationOptions,
        validation_alias="sourceSeparation",
        serialization_alias="sourceSeparation",
    )
    word_timestamps: WordTimestampsOptions = Field(
        default_factory=WordTimestampsOptions,
        validation_alias="wordTimestamps",
        serialization_alias="wordTimestamps",
    )


class TranscribeJobInput(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    options: TranscribeOptions = Field(default_factory=TranscribeOptions)
