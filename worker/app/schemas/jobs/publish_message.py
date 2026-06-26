from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus


class PublishJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    publish_task_id: UUID = Field(alias="publishTaskId")
    media_id: UUID | None = Field(default=None, alias="mediaId")
    project_id: UUID | None = Field(default=None, alias="projectId")
    short_clip_id: UUID | None = Field(default=None, alias="shortClipId")
    export_asset_id: UUID | None = Field(default=None, alias="exportAssetId")
    user_id: UUID = Field(alias="userId")
    platform: Literal["YOUTUBE", "FACEBOOK", "TIKTOK"]
    platform_account_id: UUID = Field(alias="platformAccountId")
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")
    task_name: Literal["publish"] = Field(alias="taskName")


class PublishJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["publish.job.result"] = "publish.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(validation_alias="jobId", serialization_alias="jobId")
    publish_task_id: UUID = Field(
        validation_alias="publishTaskId",
        serialization_alias="publishTaskId",
    )
    user_id: UUID = Field(validation_alias="userId", serialization_alias="userId")
    status: JobStatus
    skipped: bool
