from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GenerateShortClipsJobOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["generate_short_clips.job.output"] = "generate_short_clips.job.output"
    version: Literal[1] = 1
    transcript_id: UUID = Field(
        validation_alias="transcriptId", serialization_alias="transcriptId"
    )
    transcript_version: int = Field(
        validation_alias="transcriptVersion",
        serialization_alias="transcriptVersion",
    )
    candidate_count: int = Field(
        validation_alias="candidateCount", serialization_alias="candidateCount"
    )
    short_clip_count: int = Field(
        validation_alias="shortClipCount", serialization_alias="shortClipCount"
    )
    asset_count: int = Field(
        validation_alias="assetCount", serialization_alias="assetCount"
    )
    candidate_ids: list[UUID] = Field(
        validation_alias="candidateIds", serialization_alias="candidateIds"
    )
    short_clip_ids: list[UUID] = Field(
        validation_alias="shortClipIds", serialization_alias="shortClipIds"
    )
    asset_ids: list[UUID] = Field(
        validation_alias="assetIds", serialization_alias="assetIds"
    )
