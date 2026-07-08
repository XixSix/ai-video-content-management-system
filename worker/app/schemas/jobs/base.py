from typing import Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.db.processsing_job import JobType

JobTypeT = TypeVar("JobTypeT", bound=JobType)
TaskNameT = TypeVar("TaskNameT", bound=str)


class WorkerJobMessage(BaseModel, Generic[JobTypeT, TaskNameT]):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    version: Literal[1] = 1
    job_id: UUID = Field(alias="jobId")
    job_type: JobTypeT = Field(alias="jobType")
    task_name: TaskNameT = Field(alias="taskName")
