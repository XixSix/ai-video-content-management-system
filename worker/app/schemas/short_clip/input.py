from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LLMOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    enabled: bool = True
    model: str | None = None


class GenerateShortClipsOptions(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    clip_count: int = Field(
        default=3,
        ge=1,
        le=10,
        validation_alias="clipCount",
        serialization_alias="clipCount",
    )
    min_duration: float = Field(
        default=20,
        ge=5,
        validation_alias="minDuration",
        serialization_alias="minDuration",
    )
    max_duration: float = Field(
        default=60,
        ge=5,
        validation_alias="maxDuration",
        serialization_alias="maxDuration",
    )
    aspect_ratio: Literal["9:16", "1:1", "16:9"] = Field(
        default="9:16",
        validation_alias="aspectRatio",
        serialization_alias="aspectRatio",
    )
    platform: str = "AUTO"
    genre: str = "AUTO"
    tone: str = "AUTO"
    language: str = "auto"
    prompt: str | None = None
    llm: LLMOptions = Field(default_factory=LLMOptions)
    burn_subtitle: bool = Field(
        default=True,
        validation_alias="burnSubtitle",
        serialization_alias="burnSubtitle",
    )
    caption_preset_id: str | None = Field(
        default=None,
        validation_alias="captionPresetId",
        serialization_alias="captionPresetId",
    )


class GenerateShortClipsJobInput(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    type: Literal["generate_short_clips.job.input"] = "generate_short_clips.job.input"
    version: Literal[1] = 1
    transcript_id: UUID = Field(
        validation_alias="transcriptId",
        serialization_alias="transcriptId",
    )
    transcript_version: int = Field(
        validation_alias="transcriptVersion",
        serialization_alias="transcriptVersion",
    )
    options: GenerateShortClipsOptions = Field(
        default_factory=GenerateShortClipsOptions
    )
