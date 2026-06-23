from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

import pytest

from app.db.media_preview_repository import PersistedMediaPreviewAsset
from app.pipelines.media_preview import pipeline as media_preview_pipeline
from app.schemas.jobs.media_preview_message import MediaPreviewJobMessage
from app.schemas.media_preview.output import MediaPreviewCompletedOutput
from app.services.ffmpeg_service import FFmpegCommandError
from app.services.s3_service import S3SourceObjectNotFoundError

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000003")
USER_ID = UUID("00000000-0000-4000-8000-000000000004")
ASSET_ID = UUID("00000000-0000-4000-8000-000000000005")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> MediaPreviewJobMessage:
    return MediaPreviewJobMessage.model_validate(
        {
            "jobId": str(JOB_ID),
            "jobType": "GENERATE_THUMBNAIL",
            "mediaId": str(MEDIA_ID),
            "workspaceId": str(WORKSPACE_ID),
            "userId": str(USER_ID),
            "s3Bucket": "source-media",
            "s3Key": "uploads/video.mp4",
            "mediaType": "VIDEO",
            "mimeType": "video/mp4",
            "taskName": "generate_thumbnail",
        }
    )


def _persisted_asset() -> PersistedMediaPreviewAsset:
    return PersistedMediaPreviewAsset(
        id=ASSET_ID,
        asset_type="THUMBNAIL",
        s3_bucket="vidpilot-media",
        s3_key=f"generated/workspaces/{WORKSPACE_ID}/media/{MEDIA_ID}/previews/{JOB_ID}/thumbnail.jpg",
        metadata={"algorithmVersion": 1},
    )


class _FakeProbe:
    has_video = True
    has_audio = True
    duration_seconds = 10.0


def test_run_media_preview_pipeline_downloads_processes_uploads_persists_and_returns_output(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    calls: dict[str, object] = {
        "downloaded": 0,
        "probed": 0,
        "pipeline_ran": 0,
        "uploaded": 0,
        "upserted": 0,
    }

    monkeypatch.setattr(media_preview_pipeline.settings, "tmp_dir", tmp_path / "tmp")
    monkeypatch.setattr(media_preview_pipeline.settings, "s3_bucket", "vidpilot-media")
    monkeypatch.setattr(media_preview_pipeline.settings, "s3_region", "ap-southeast-1")
    monkeypatch.setattr(media_preview_pipeline, "get_db_session", _session)

    def download_file(s3_key: str, destination_path: Path, *, bucket: str) -> Path:
        calls["downloaded"] += 1
        assert s3_key == "uploads/video.mp4"
        assert bucket == "source-media"
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.write_bytes(b"video")
        return destination_path

    def probe_media(source_path: Path) -> _FakeProbe:
        calls["probed"] += 1
        assert source_path.read_bytes() == b"video"
        return _FakeProbe()

    def upload_file(local_path: Path, object_key: str, *, content_type: str) -> str:
        calls["uploaded"] += 1
        assert local_path.exists()
        assert object_key.endswith("thumbnail.jpg")
        assert content_type == "image/jpeg"
        return object_key

    def upsert_asset(
        session: object,
        *,
        user_id: str,
        media_id: str,
        job_id: str,
        asset_type: str,
        s3_bucket: str,
        s3_key: str,
        s3_region: str | None,
        mime_type: str,
        file_size_bytes: int,
        metadata: dict,
    ) -> PersistedMediaPreviewAsset:
        calls["upserted"] += 1
        assert user_id == str(USER_ID)
        assert media_id == str(MEDIA_ID)
        assert job_id == str(JOB_ID)
        assert asset_type == "THUMBNAIL"
        assert s3_bucket == "vidpilot-media"
        assert mime_type == "image/jpeg"
        return _persisted_asset()

    # Patch the generation sub-function so we don't need ffmpeg/PIL.
    from app.schemas.media_preview.output import (
        MediaPreviewArtifact,
        MediaPreviewPipelineOutput,
    )

    def fake_run_pipeline(
        message: MediaPreviewJobMessage,
        workspace: Path,
    ) -> MediaPreviewPipelineOutput:
        calls["pipeline_ran"] += 1
        output_path = workspace / "thumbnail.jpg"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(b"jpeg")
        return MediaPreviewPipelineOutput(
            artifacts=[
                MediaPreviewArtifact(
                    asset_type="THUMBNAIL",
                    local_path=output_path,
                    object_key=(
                        f"generated/workspaces/{WORKSPACE_ID}/media/{MEDIA_ID}"
                        f"/previews/{JOB_ID}/thumbnail.jpg"
                    ),
                    mime_type="image/jpeg",
                    metadata={"algorithmVersion": 1},
                )
            ],
            summary={"selectedTimestampSeconds": 3.0},
        )

    monkeypatch.setattr(
        media_preview_pipeline.s3_service, "download_file", download_file
    )
    monkeypatch.setattr(
        media_preview_pipeline.ffmpeg_service, "probe_media", probe_media
    )
    monkeypatch.setattr(media_preview_pipeline.s3_service, "upload_file", upload_file)
    monkeypatch.setattr(
        media_preview_pipeline.media_preview_repository, "upsert_asset", upsert_asset
    )
    monkeypatch.setattr(media_preview_pipeline, "_run_pipeline", fake_run_pipeline)

    output = media_preview_pipeline.run_media_preview_pipeline(_message())

    assert isinstance(output, MediaPreviewCompletedOutput)
    assert len(output.assets) == 1
    assert output.assets[0].id == ASSET_ID
    assert output.assets[0].asset_type == "THUMBNAIL"
    assert output.summary == {"selectedTimestampSeconds": 3.0}
    assert calls["uploaded"] == 1
    assert calls["upserted"] == 1
    assert calls["pipeline_ran"] == 1


def test_run_media_preview_pipeline_maps_missing_source_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(media_preview_pipeline.settings, "tmp_dir", tmp_path / "tmp")

    def raise_not_found(s3_key: str, destination_path: Path, *, bucket: str) -> Path:
        raise S3SourceObjectNotFoundError("not found")

    monkeypatch.setattr(
        media_preview_pipeline.s3_service, "download_file", raise_not_found
    )

    with pytest.raises(
        media_preview_pipeline.TerminalMediaPreviewPipelineError
    ) as exc_info:
        media_preview_pipeline.run_media_preview_pipeline(_message())

    assert exc_info.value.error_code == "SOURCE_OBJECT_NOT_FOUND"


def test_run_media_preview_pipeline_maps_ffmpeg_error_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(media_preview_pipeline.settings, "tmp_dir", tmp_path / "tmp")

    def download_file(s3_key: str, destination_path: Path, *, bucket: str) -> Path:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        destination_path.write_bytes(b"video")
        return destination_path

    def raise_ffmpeg_error(source_path: Path) -> _FakeProbe:
        raise FFmpegCommandError("ffprobe failed: bad input")

    monkeypatch.setattr(
        media_preview_pipeline.s3_service, "download_file", download_file
    )
    monkeypatch.setattr(
        media_preview_pipeline.ffmpeg_service, "probe_media", raise_ffmpeg_error
    )

    with pytest.raises(
        media_preview_pipeline.TerminalMediaPreviewPipelineError
    ) as exc_info:
        media_preview_pipeline.run_media_preview_pipeline(_message())

    assert exc_info.value.error_code == "INVALID_MEDIA"
