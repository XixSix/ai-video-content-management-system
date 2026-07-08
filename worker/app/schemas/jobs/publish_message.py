from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobStatus, JobType
from app.schemas.jobs.base import WorkerJobMessage


class PublishJobMessage(WorkerJobMessage[Literal[JobType.PUBLISH], Literal["publish"]]):
    pass


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
