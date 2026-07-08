from uuid import UUID

from app.schemas.render_export.input import RenderExportJobInput
from app.schemas.render_export.output import RenderExportJobOutput

SNAPSHOT_ID = UUID("00000000-0000-4000-8000-000000000001")
PUBLISH_TASK_ID = UUID("00000000-0000-4000-8000-000000000002")
ASSET_ID = UUID("00000000-0000-4000-8000-000000000003")


def test_render_export_job_input_has_stable_shape() -> None:
    job_input = RenderExportJobInput(
        editor_snapshot_id=SNAPSHOT_ID,
        editor_snapshot_version=3,
        publish_task_id=PUBLISH_TASK_ID,
    ).model_dump(mode="json", by_alias=True)

    assert job_input == {
        "editorSnapshotId": str(SNAPSHOT_ID),
        "editorSnapshotVersion": 3,
        "publishTaskId": str(PUBLISH_TASK_ID),
    }


def test_render_export_job_output_has_stable_shape() -> None:
    output = RenderExportJobOutput(
        asset_id=ASSET_ID,
    ).model_dump(mode="json", by_alias=True)

    assert output == {
        "type": "render_export.job.output",
        "version": 1,
        "assetId": str(ASSET_ID),
    }
