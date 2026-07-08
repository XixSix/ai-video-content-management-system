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


class MediaPreviewJobOutput(BaseModel):
    """Lightweight media preview output persisted on the processing job."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["media_preview.job.output"] = "media_preview.job.output"
    version: Literal[1] = 1
    asset_count: int = Field(
        validation_alias="assetCount",
        serialization_alias="assetCount",
    )
    asset_ids: list[UUID] = Field(
        validation_alias="assetIds",
        serialization_alias="assetIds",
    )
