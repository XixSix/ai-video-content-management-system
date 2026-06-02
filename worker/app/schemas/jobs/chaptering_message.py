from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus


class ChapteringJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    transcript_id: UUID = Field(alias="transcriptId")
    transcript_version: int = Field(alias="transcriptVersion")
    task_name: Literal["generate_chapters"] = Field(alias="taskName")


class ChapteringJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["chaptering.job.result"] = "chaptering.job.result"
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
