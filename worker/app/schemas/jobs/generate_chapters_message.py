from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus, JobType
from app.schemas.jobs.base import WorkerJobMessage


class GenerateChaptersJobMessage(
    WorkerJobMessage[Literal[JobType.GENERATE_CHAPTERS], Literal["generate_chapters"]]
):
    pass


class GenerateChaptersJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["generate_chapters.job.result"] = "generate_chapters.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    transcript_id: UUID = Field(alias="transcriptId")
    transcript_version: int = Field(alias="transcriptVersion")
    status: JobStatus
    skipped: bool
