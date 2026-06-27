from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ShortClipCandidateSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    start_time: float = Field(alias="startTime")
    end_time: float = Field(alias="endTime")
    duration: float
    title: str | None
    score: float | None


class ShortClipSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    candidate_id: UUID = Field(alias="candidateId")
    status: str


class ShortClipAssetSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    asset_type: str = Field(alias="assetType")
    s3_bucket: str = Field(alias="s3Bucket")
    s3_key: str = Field(alias="s3Key")


class ShortClipCompletedOutput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["short_clip.completed"] = "short_clip.completed"
    version: Literal[1] = 1
    transcript_id: UUID = Field(alias="transcriptId")
    transcript_version: int = Field(alias="transcriptVersion")
    candidate_ids: list[UUID] = Field(alias="candidateIds")
    short_clip_ids: list[UUID] = Field(alias="shortClipIds")
    asset_ids: list[UUID] = Field(alias="assetIds")
    candidates: list[ShortClipCandidateSummary]
    short_clips: list[ShortClipSummary] = Field(alias="shortClips")
    assets: list[ShortClipAssetSummary]
