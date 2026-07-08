from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PublishJobOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["publish.job.output"] = "publish.job.output"
    version: Literal[1] = 1
    publish_task_id: UUID = Field(
        validation_alias="publishTaskId",
        serialization_alias="publishTaskId",
    )
