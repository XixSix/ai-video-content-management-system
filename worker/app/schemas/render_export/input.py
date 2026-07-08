from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RenderExportJobInput(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    editor_snapshot_id: UUID = Field(
        validation_alias="editorSnapshotId",
        serialization_alias="editorSnapshotId",
    )
    editor_snapshot_version: int = Field(
        validation_alias="editorSnapshotVersion",
        serialization_alias="editorSnapshotVersion",
    )
    publish_task_id: UUID | None = Field(
        default=None,
        validation_alias="publishTaskId",
        serialization_alias="publishTaskId",
    )
