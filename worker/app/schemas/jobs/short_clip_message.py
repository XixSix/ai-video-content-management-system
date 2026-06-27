from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus


class ShortClipJobPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    transcript_id: UUID = Field(alias="transcriptId")
    transcript_version: int = Field(alias="transcriptVersion")
    clip_count: int = Field(alias="clipCount", ge=1, le=10)
    clip_length: Literal["AUTO", "15_30", "30_60", "60_90"] = Field(alias="clipLength")
    min_duration: float = Field(alias="minDuration", ge=5)
    max_duration: float = Field(alias="maxDuration", ge=5)
    aspect_ratio: Literal["9:16", "1:1", "16:9"] = Field(alias="aspectRatio")
    language: Literal["AUTO", "ENGLISH", "VIETNAMESE"]
    genre: Literal["AUTO", "PODCAST", "INTERVIEW", "TUTORIAL", "WEBINAR"]
    clip_model: Literal["AUTO", "BALANCED", "VIRAL_HOOKS"] = Field(alias="clipModel")
    auto_hook: bool = Field(alias="autoHook")
    prompt: str
    caption_preset_id: str = Field(alias="captionPresetId")
    burn_subtitle: bool = Field(alias="burnSubtitle")


class ShortClipJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    transcript_id: UUID = Field(alias="transcriptId")
    transcript_version: int = Field(alias="transcriptVersion")
    preferences: ShortClipJobPreferences
    task_name: Literal["generate_short_clips"] = Field(alias="taskName")


class ShortClipJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["short_clip.job.result"] = "short_clip.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(validation_alias="jobId", serialization_alias="jobId")
    media_id: UUID = Field(validation_alias="mediaId", serialization_alias="mediaId")
    user_id: UUID = Field(validation_alias="userId", serialization_alias="userId")
    transcript_id: UUID = Field(
        validation_alias="transcriptId", serialization_alias="transcriptId"
    )
    transcript_version: int = Field(
        validation_alias="transcriptVersion",
        serialization_alias="transcriptVersion",
    )
    status: JobStatus
    skipped: bool
