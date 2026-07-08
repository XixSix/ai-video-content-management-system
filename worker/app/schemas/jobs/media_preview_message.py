from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.db.processsing_job import JobStatus, JobType
from app.schemas.jobs.base import WorkerJobMessage

MediaPreviewTaskName = Literal[
    "generate_thumbnail",
    "generate_thumbnail_sprite",
    "generate_waveform_peak",
]
TASK_NAME_BY_JOB_TYPE: dict[JobType, MediaPreviewTaskName] = {
    JobType.GENERATE_THUMBNAIL: "generate_thumbnail",
    JobType.GENERATE_THUMBNAIL_SPRITE: "generate_thumbnail_sprite",
    JobType.GENERATE_WAVEFORM_PEAK: "generate_waveform_peak",
}


class MediaPreviewJobMessage(
    WorkerJobMessage[
        Literal[
            JobType.GENERATE_THUMBNAIL,
            JobType.GENERATE_THUMBNAIL_SPRITE,
            JobType.GENERATE_WAVEFORM_PEAK,
        ],
        MediaPreviewTaskName,
    ]
):
    @model_validator(mode="after")
    def validate_job_contract(self) -> "MediaPreviewJobMessage":
        expected_task_name = TASK_NAME_BY_JOB_TYPE[self.job_type]

        if self.task_name != expected_task_name:
            raise ValueError(
                f"taskName {self.task_name} does not match jobType {self.job_type.value}"
            )

        return self


class MediaPreviewJobResultMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["media_preview.job.result"] = "media_preview.job.result"
    version: Literal[1] = 1
    job_id: UUID = Field(validation_alias="jobId", serialization_alias="jobId")
    media_id: UUID = Field(validation_alias="mediaId", serialization_alias="mediaId")
    user_id: UUID = Field(validation_alias="userId", serialization_alias="userId")
    status: JobStatus
    skipped: bool
