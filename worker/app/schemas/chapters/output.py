from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GenerateChaptersJobOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["generate_chapters.job.output"] = "generate_chapters.job.output"
    version: Literal[1] = 1
    transcript_id: UUID = Field(
        validation_alias="transcriptId", serialization_alias="transcriptId"
    )
    transcript_version: int = Field(
        validation_alias="transcriptVersion",
        serialization_alias="transcriptVersion",
    )
    chapter_count: int = Field(
        validation_alias="chapterCount", serialization_alias="chapterCount"
    )
