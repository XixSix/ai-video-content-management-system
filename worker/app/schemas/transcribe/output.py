from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TranscribeJobOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["transcribe.job.output"] = "transcribe.job.output"
    version: Literal[1] = 1
    transcript_id: UUID = Field(
        validation_alias="transcriptId", serialization_alias="transcriptId"
    )
    segment_count: int = Field(
        validation_alias="segmentCount", serialization_alias="segmentCount"
    )
    word_count: int = Field(
        validation_alias="wordCount", serialization_alias="wordCount"
    )
