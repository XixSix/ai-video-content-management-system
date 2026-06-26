from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JobType(StrEnum):
    TRANSCRIBE = "TRANSCRIBE"
    GENERATE_SUBTITLE = "GENERATE_SUBTITLE"
    GENERATE_CHAPTERS = "GENERATE_CHAPTERS"
    GENERATE_SHORT_CLIPS = "GENERATE_SHORT_CLIPS"
    EXPORT_RENDER = "EXPORT_RENDER"
    BURN_SUBTITLE = "BURN_SUBTITLE"
    PUBLISH = "PUBLISH"
    GENERATE_THUMBNAIL = "GENERATE_THUMBNAIL"
    GENERATE_THUMBNAIL_SPRITE = "GENERATE_THUMBNAIL_SPRITE"
    GENERATE_WAVEFORM_PEAK = "GENERATE_WAVEFORM_PEAK"


class JobStatus(StrEnum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    TRANSCRIBING = "TRANSCRIBING"
    GENERATING_SUBTITLE = "GENERATING_SUBTITLE"
    BURNING_SUBTITLE = "BURNING_SUBTITLE"
    GENERATING_CHAPTERS = "GENERATING_CHAPTERS"
    GENERATING_SHORT_CLIPS = "GENERATING_SHORT_CLIPS"
    GENERATING_MEDIA_PREVIEW = "GENERATING_MEDIA_PREVIEW"
    PUBLISHING = "PUBLISHING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"


class ProcessingJobRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    project_id: UUID | None = Field(default=None, alias="projectId")
    job_type: JobType = Field(alias="jobType")
    status: JobStatus
    progress: int | None
    current_step: str | None = Field(alias="currentStep")
    error_message: str | None = Field(alias="errorMessage")
    queue_name: str | None = Field(alias="queueName")
    task_name: str | None = Field(alias="taskName")
    external_task_id: str | None = Field(alias="externalTaskId")
    attempt_count: int = Field(alias="attemptCount")
    input: Any
    output: Any
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    started_at: datetime | None = Field(alias="startedAt")
    completed_at: datetime | None = Field(alias="completedAt")
