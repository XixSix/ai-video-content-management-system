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
    GENERATE_AI_SUGGESTIONS = "GENERATE_AI_SUGGESTIONS"
    BURN_SUBTITLE = "BURN_SUBTITLE"
    PUBLISH = "PUBLISH"


class JobStatus(StrEnum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    EXTRACTING_AUDIO = "EXTRACTING_AUDIO"
    TRANSCRIBING = "TRANSCRIBING"
    PREPROCESSING_TRANSCRIPT = "PREPROCESSING_TRANSCRIPT"
    GENERATING_SUBTITLE = "GENERATING_SUBTITLE"
    BURNING_SUBTITLE = "BURNING_SUBTITLE"
    GENERATING_CHAPTERS = "GENERATING_CHAPTERS"
    GENERATING_CLIP_CANDIDATES = "GENERATING_CLIP_CANDIDATES"
    DEDUPLICATING_CANDIDATES = "DEDUPLICATING_CANDIDATES"
    SCORING_SALIENCY = "SCORING_SALIENCY"
    SCORING_HIGHLIGHTS = "SCORING_HIGHLIGHTS"
    FILTERING_DIVERSITY = "FILTERING_DIVERSITY"
    SELECTING_CLIPS = "SELECTING_CLIPS"
    CUTTING_VIDEO = "CUTTING_VIDEO"
    CONVERTING_ASPECT_RATIO = "CONVERTING_ASPECT_RATIO"
    GENERATING_SUGGESTIONS = "GENERATING_SUGGESTIONS"
    PUBLISHING = "PUBLISHING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ProcessingJobRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
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
