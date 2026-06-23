from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db.media_preview_repository import PersistedMediaPreviewAsset
from app.handlers import media_preview_handler
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.media_preview_message import MediaPreviewJobMessage
from app.schemas.media_preview.output import (
    MediaPreviewCompletedOutput,
    PersistedAssetSummary,
)

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


def _job(status: JobStatus = JobStatus.PENDING) -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "jobType": JobType.GENERATE_THUMBNAIL,
            "status": status,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": "media_previews_queue",
            "taskName": "generate_thumbnail",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": None,
            "output": None,
            "createdAt": "2026-06-23T00:00:00Z",
            "updatedAt": "2026-06-23T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _asset() -> PersistedMediaPreviewAsset:
    return PersistedMediaPreviewAsset(
        id=ASSET_ID,
        asset_type="THUMBNAIL",
        s3_bucket="generated-media",
        s3_key=f"generated/previews/{JOB_ID}/thumbnail.jpg",
        metadata={"algorithmVersion": 1},
    )


def _completed_output() -> MediaPreviewCompletedOutput:
    return MediaPreviewCompletedOutput(
        assets=[
            PersistedAssetSummary(
                id=ASSET_ID,
                asset_type="THUMBNAIL",
                s3_bucket="generated-media",
                s3_key=f"generated/previews/{JOB_ID}/thumbnail.jpg",
                metadata={"algorithmVersion": 1},
            )
        ],
        summary={"selectedTimestampSeconds": 2},
    )


def _patch_job_lifecycle(
    monkeypatch: pytest.MonkeyPatch,
) -> dict[str, object]:
    calls: dict[str, object] = {
        "completed": None,
        "pipeline": 0,
        "steps": [],
    }
    monkeypatch.setattr(media_preview_handler, "get_db_session", _session)
    monkeypatch.setattr(
        media_preview_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        media_preview_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        media_preview_handler.jobs_repository,
        "mark_job_step",
        lambda session, job_id, **kwargs: calls["steps"].append(kwargs),
    )
    monkeypatch.setattr(
        media_preview_handler.jobs_repository,
        "mark_job_completed",
        lambda session, job_id, *, output: calls.update(completed=output),
    )
    monkeypatch.setattr(
        media_preview_handler.media_preview_repository,
        "find_assets_by_job_id",
        lambda session, job_id: [],
    )

    def run_pipeline(message: MediaPreviewJobMessage) -> MediaPreviewCompletedOutput:
        calls["pipeline"] += 1
        return _completed_output()

    monkeypatch.setattr(
        media_preview_handler, "run_media_preview_pipeline", run_pipeline
    )
    return calls


def test_process_media_preview_job_calls_pipeline_and_completes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_job_lifecycle(monkeypatch)

    result = media_preview_handler.process_media_preview_job(_message())

    assert result["status"] == "COMPLETED"
    assert result["skipped"] is False
    assert calls["pipeline"] == 1
    assert calls["completed"] == {
        "type": "media_preview.completed",
        "version": 1,
        "assets": [
            {
                "id": str(ASSET_ID),
                "assetType": "THUMBNAIL",
                "s3Bucket": "generated-media",
                "s3Key": f"generated/previews/{JOB_ID}/thumbnail.jpg",
                "metadata": {"algorithmVersion": 1},
            }
        ],
        "summary": {"selectedTimestampSeconds": 2},
    }


def test_process_media_preview_job_reuses_existing_assets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_job_lifecycle(monkeypatch)
    monkeypatch.setattr(
        media_preview_handler.media_preview_repository,
        "find_assets_by_job_id",
        lambda session, job_id: [_asset()],
    )

    result = media_preview_handler.process_media_preview_job(_message())

    assert result["status"] == "COMPLETED"
    assert result["skipped"] is True
    assert calls["pipeline"] == 0
    assert calls["completed"]["summary"] == {"reused": True}
