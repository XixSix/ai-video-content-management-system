from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PublishJobInput(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    publish_task_id: UUID = Field(
        validation_alias="publishTaskId",
        serialization_alias="publishTaskId",
    )
    export_asset_id: UUID | None = Field(
        default=None,
        validation_alias="exportAssetId",
        serialization_alias="exportAssetId",
    )
