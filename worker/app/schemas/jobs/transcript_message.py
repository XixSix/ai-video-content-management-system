from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic import constr

from app.schemas.db.processsing_job import JobStatus


class TranscriptJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    s3_key: constr(strip_whitespace=True, min_length=1) = Field(alias="s3Key")  # type: ignore
    task_name: Literal["transcribe"] = Field(alias="taskName")


class TranscriptJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["transcript.job.result"] = "transcript.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    status: JobStatus
    skipped: bool
