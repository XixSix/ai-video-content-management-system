from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus


class RenderExportJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    project_id: UUID = Field(alias="projectId")
    workspace_id: UUID = Field(alias="workspaceId")
    user_id: UUID = Field(alias="userId")
    task_name: Literal["export_render"] = Field(alias="taskName")


class RenderExportJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["render_export.job.result"] = "render_export.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(validation_alias="jobId", serialization_alias="jobId")
    media_id: UUID = Field(validation_alias="mediaId", serialization_alias="mediaId")
    project_id: UUID = Field(
        validation_alias="projectId",
        serialization_alias="projectId",
    )
    user_id: UUID = Field(validation_alias="userId", serialization_alias="userId")
    status: JobStatus
    skipped: bool
