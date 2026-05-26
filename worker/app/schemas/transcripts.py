from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, constr


class TranscriptJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    s3_key: constr(strip_whitespace=True, min_length=1) = Field(alias="s3Key")
    task_name: Literal["transcribe"] = Field(alias="taskName")
