from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RenderExportAssetSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    asset_type: str = Field(
        validation_alias="assetType", serialization_alias="assetType"
    )
    s3_bucket: str = Field(validation_alias="s3Bucket", serialization_alias="s3Bucket")
    s3_key: str = Field(validation_alias="s3Key", serialization_alias="s3Key")
    metadata: dict[str, Any] | None = None


class RenderExportCompletedOutput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["render_export.completed"] = "render_export.completed"
    version: Literal[1] = 1
    asset: RenderExportAssetSummary
    summary: dict[str, Any]
