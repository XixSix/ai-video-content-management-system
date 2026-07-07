from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus, JobType
from app.schemas.jobs.base import WorkerJobMessage


class TranscribeJobMessage(
    WorkerJobMessage[Literal[JobType.TRANSCRIBE], Literal["transcribe"]]
):
    pass


class TranscribeJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["transcript.job.result"] = "transcript.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    status: JobStatus
    skipped: bool
