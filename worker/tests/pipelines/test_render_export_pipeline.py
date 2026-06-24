from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

import pytest

from app.db.render_export_repository import (
    PersistedRenderExportAsset,
    RenderExportMedia,
    RenderExportProject,
    RenderExportSnapshot,
)
from app.pipelines.render_export import pipeline
from app.schemas.jobs.render_export_message import RenderExportJobMessage

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
PROJECT_ID = UUID("00000000-0000-4000-8000-000000000003")
WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000004")
USER_ID = UUID("00000000-0000-4000-8000-000000000005")
SNAPSHOT_ID = UUID("00000000-0000-4000-8000-000000000006")
ASSET_ID = UUID("00000000-0000-4000-8000-000000000007")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> RenderExportJobMessage:
    return RenderExportJobMessage.model_validate(
        {
            "jobId": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "projectId": str(PROJECT_ID),
            "workspaceId": str(WORKSPACE_ID),
            "userId": str(USER_ID),
            "taskName": "export_render",
        }
    )


def _project() -> RenderExportProject:
    return RenderExportProject(
        id=PROJECT_ID,
        user_id=USER_ID,
        workspace_id=WORKSPACE_ID,
        aspect_ratio="16:9",
        duration=10,
        media=RenderExportMedia(
            id=MEDIA_ID,
            user_id=USER_ID,
            workspace_id=WORKSPACE_ID,
            s3_bucket="vidpilot-media",
            s3_key="uploads/source.mp4",
            s3_region="ap-southeast-1",
            duration=10,
            width=1920,
            height=1080,
            mime_type="video/mp4",
        ),
        snapshot=RenderExportSnapshot(
            id=SNAPSHOT_ID,
            version=3,
            document={
                "settings": {"aspectRatio": "16:9"},
                "layers": [],
                "timelineTracks": [
                    {
                        "id": "SOURCE",
                        "segments": [
                            {
                                "id": "source-segment",
                                "mediaId": str(MEDIA_ID),
                                "startTime": 0,
                                "durationSeconds": 10,
                            }
                        ],
                    }
                ],
            },
        ),
    )


def test_build_render_document_uses_http_source_url() -> None:
    document = pipeline.build_render_document(
        _project(),
        source_url="http://localhost:9000/vidpilot-media/uploads/source.mp4?signature=test",
        captions=None,
    )

    assert document["sourceVideo"]["src"].startswith("http://localhost:9000/")
    assert not document["sourceVideo"]["src"].startswith("file://")


def test_run_render_export_pipeline_presigns_source_without_downloading(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls: dict[str, object] = {}
    monkeypatch.setattr(pipeline.settings, "tmp_dir", tmp_path)
    monkeypatch.setattr(pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        pipeline.render_export_repository,
        "find_project_render_source",
        lambda session, *, project_id: _project(),
    )
    monkeypatch.setattr(
        pipeline.render_export_repository,
        "find_latest_caption_source",
        lambda session, *, media_id: None,
    )

    class FakeS3Service:
        def create_presigned_get_url(
            self,
            object_key: str,
            *,
            bucket: str,
            expires_in_seconds: int,
        ) -> str:
            calls["presigned"] = {
                "object_key": object_key,
                "bucket": bucket,
                "expires_in_seconds": expires_in_seconds,
            }
            return (
                "http://localhost:9000/vidpilot-media/uploads/source.mp4?signature=test"
            )

        def download_file(self, *args: object, **kwargs: object) -> None:
            raise AssertionError("render export should not download source media")

        def upload_file(
            self,
            source_path: Path,
            object_key: str,
            *,
            content_type: str,
        ) -> str:
            calls["upload"] = {
                "exists": source_path.exists(),
                "object_key": object_key,
                "content_type": content_type,
            }
            return object_key

    class FakeRendererService:
        def render_document(self, document_path: Path, output_path: Path) -> Path:
            calls["document"] = document_path.read_text(encoding="utf-8")
            output_path.write_bytes(b"video")
            return output_path

    monkeypatch.setattr(pipeline, "s3_service", FakeS3Service())
    monkeypatch.setattr(pipeline, "renderer_service", FakeRendererService())
    monkeypatch.setattr(
        pipeline.render_export_repository,
        "upsert_export_asset",
        lambda session, **kwargs: PersistedRenderExportAsset(
            id=ASSET_ID,
            asset_type="EXPORT_VIDEO",
            s3_bucket=kwargs["s3_bucket"],
            s3_key=kwargs["s3_key"],
            metadata=kwargs["metadata"],
        ),
    )

    output = pipeline.run_render_export_pipeline(_message())

    assert calls["presigned"] == {
        "object_key": "uploads/source.mp4",
        "bucket": "vidpilot-media",
        "expires_in_seconds": pipeline.settings.renderer_timeout_seconds + 300,
    }
    assert "file://" not in calls["document"]
    assert (
        "http://localhost:9000/vidpilot-media/uploads/source.mp4" in calls["document"]
    )
    assert calls["upload"]["exists"] is True
    assert calls["upload"]["content_type"] == "video/mp4"
    assert output.summary["assetId"] == str(ASSET_ID)
