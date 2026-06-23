from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, constr, model_validator

from app.schemas.db.processsing_job import JobStatus, JobType

MediaPreviewTaskName = Literal[
    "generate_thumbnail",
    "generate_thumbnail_sprite",
    "generate_waveform_peak",
]
MediaType = Literal["VIDEO", "AUDIO", "IMAGE", "SUBTITLE"]

TASK_NAME_BY_JOB_TYPE: dict[JobType, MediaPreviewTaskName] = {
    JobType.GENERATE_THUMBNAIL: "generate_thumbnail",
    JobType.GENERATE_THUMBNAIL_SPRITE: "generate_thumbnail_sprite",
    JobType.GENERATE_WAVEFORM_PEAK: "generate_waveform_peak",
}


class MediaPreviewJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    job_type: Literal[
        JobType.GENERATE_THUMBNAIL,
        JobType.GENERATE_THUMBNAIL_SPRITE,
        JobType.GENERATE_WAVEFORM_PEAK,
    ] = Field(alias="jobType")
    media_id: UUID = Field(alias="mediaId")
    workspace_id: UUID = Field(alias="workspaceId")
    user_id: UUID = Field(alias="userId")
    s3_bucket: constr(strip_whitespace=True, min_length=1) = Field(alias="s3Bucket")  # type: ignore
    s3_key: constr(strip_whitespace=True, min_length=1) = Field(alias="s3Key")  # type: ignore
    media_type: MediaType = Field(alias="mediaType")
    mime_type: str | None = Field(default=None, alias="mimeType")
    task_name: MediaPreviewTaskName = Field(alias="taskName")

    @model_validator(mode="after")
    def validate_job_contract(self) -> "MediaPreviewJobMessage":
        expected_task_name = TASK_NAME_BY_JOB_TYPE[self.job_type]

        if self.task_name != expected_task_name:
            raise ValueError(
                f"taskName {self.task_name} does not match jobType {self.job_type.value}"
            )

        if (
            self.job_type
            in {
                JobType.GENERATE_THUMBNAIL,
                JobType.GENERATE_THUMBNAIL_SPRITE,
            }
            and self.media_type != "VIDEO"
        ):
            raise ValueError(f"{self.job_type.value} requires VIDEO media")

        if self.job_type == JobType.GENERATE_WAVEFORM_PEAK and self.media_type not in {
            "VIDEO",
            "AUDIO",
        }:
            raise ValueError("GENERATE_WAVEFORM_PEAK requires VIDEO or AUDIO media")

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
