from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus
from app.schemas.db.processsing_job import JobType
from app.schemas.jobs.base import WorkerJobMessage


class GenerateShortClipsJobMessage(
    WorkerJobMessage[
        Literal[JobType.GENERATE_SHORT_CLIPS],
        Literal["generate_short_clips"],
    ]
):
    pass


class GenerateShortClipsJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["generate_short_clips.job.result"] = "generate_short_clips.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    transcript_id: UUID = Field(alias="transcriptId")
    transcript_version: int = Field(alias="transcriptVersion")
    status: JobStatus
    skipped: bool
