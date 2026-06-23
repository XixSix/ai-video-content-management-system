from pathlib import Path
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MediaPreviewArtifact(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    asset_type: Literal["THUMBNAIL", "THUMBNAIL_SPRITE", "WAVEFORM_PEAKS"]
    local_path: Path
    object_key: str
    mime_type: str
    metadata: dict[str, Any]


class MediaPreviewPipelineOutput(BaseModel):
    artifacts: list[MediaPreviewArtifact]
    summary: dict[str, Any] = Field(default_factory=dict)


class PersistedAssetSummary(BaseModel):
    """Lightweight summary of a persisted asset returned by the pipeline."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: UUID
    asset_type: str = Field(
        validation_alias="assetType",
        serialization_alias="assetType",
    )
    s3_bucket: str = Field(
        validation_alias="s3Bucket",
        serialization_alias="s3Bucket",
    )
    s3_key: str = Field(
        validation_alias="s3Key",
        serialization_alias="s3Key",
    )
    metadata: dict[str, Any] | None


class MediaPreviewCompletedOutput(BaseModel):
    """Completed media preview output persisted on the processing job."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["media_preview.completed"] = "media_preview.completed"
    version: Literal[1] = 1
    assets: list[PersistedAssetSummary]
    summary: dict[str, Any] = Field(default_factory=dict)
