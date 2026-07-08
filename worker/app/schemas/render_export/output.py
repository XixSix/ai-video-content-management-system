from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RenderExportJobOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    type: Literal["render_export.job.output"] = "render_export.job.output"
    version: Literal[1] = 1
    asset_id: UUID = Field(
        validation_alias="assetId",
        serialization_alias="assetId",
    )
