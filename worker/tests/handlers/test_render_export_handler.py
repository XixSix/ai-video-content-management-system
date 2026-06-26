from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db.render_export_repository import PersistedRenderExportAsset
from app.handlers import render_export_handler
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.render_export_message import RenderExportJobMessage
from app.schemas.render_export.output import (
    RenderExportAssetSummary,
    RenderExportCompletedOutput,
)

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
PROJECT_ID = UUID("00000000-0000-4000-8000-000000000003")
WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000004")
USER_ID = UUID("00000000-0000-4000-8000-000000000005")
ASSET_ID = UUID("00000000-0000-4000-8000-000000000006")


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


def _job(
    status: JobStatus = JobStatus.PENDING,
    *,
    input_payload: dict[str, object] | None = None,
) -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "projectId": str(PROJECT_ID),
            "jobType": JobType.EXPORT_RENDER,
            "status": status,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": "render_exports_queue",
            "taskName": "export_render",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": input_payload,
            "output": None,
            "createdAt": "2026-06-24T00:00:00Z",
            "updatedAt": "2026-06-24T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _asset() -> PersistedRenderExportAsset:
    return PersistedRenderExportAsset(
        id=ASSET_ID,
        asset_type="EXPORT_VIDEO",
        s3_bucket="vidpilot-media",
        s3_key=f"generated/exports/{JOB_ID}/export.mp4",
        metadata={"renderer": "remotion"},
    )


def _completed_output() -> RenderExportCompletedOutput:
    asset = _asset()
    return RenderExportCompletedOutput(
        asset=RenderExportAssetSummary(
            id=asset.id,
            asset_type=asset.asset_type,
            s3_bucket=asset.s3_bucket,
            s3_key=asset.s3_key,
            metadata=asset.metadata,
        ),
        summary={"assetId": str(ASSET_ID)},
    )


def _patch_job_lifecycle(monkeypatch: pytest.MonkeyPatch) -> dict[str, object]:
    calls: dict[str, object] = {
        "completed": None,
        "pipeline": 0,
        "steps": [],
    }
    monkeypatch.setattr(render_export_handler, "get_db_session", _session)
    monkeypatch.setattr(
        render_export_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        render_export_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        render_export_handler.jobs_repository,
        "mark_job_step",
        lambda session, job_id, **kwargs: calls["steps"].append(kwargs),
    )
    monkeypatch.setattr(
        render_export_handler.jobs_repository,
        "mark_job_completed",
        lambda session, job_id, *, output: calls.update(completed=output),
    )
    monkeypatch.setattr(
        render_export_handler.render_export_repository,
        "find_export_asset_by_job_id",
        lambda session, job_id: None,
    )

    def run_pipeline(message: RenderExportJobMessage) -> RenderExportCompletedOutput:
        calls["pipeline"] += 1
        return _completed_output()

    monkeypatch.setattr(
        render_export_handler,
        "run_render_export_pipeline",
        run_pipeline,
    )
    return calls


def test_process_render_export_job_calls_pipeline_and_completes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_job_lifecycle(monkeypatch)

    result = render_export_handler.process_render_export_job(_message())

    assert result["status"] == "COMPLETED"
    assert result["skipped"] is False
    assert calls["pipeline"] == 1
    assert calls["completed"] == {
        "type": "render_export.completed",
        "version": 1,
        "asset": {
            "id": str(ASSET_ID),
            "assetType": "EXPORT_VIDEO",
            "s3Bucket": "vidpilot-media",
            "s3Key": f"generated/exports/{JOB_ID}/export.mp4",
            "metadata": {"renderer": "remotion"},
        },
        "summary": {"assetId": str(ASSET_ID)},
    }


def test_process_render_export_job_reuses_existing_asset(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_job_lifecycle(monkeypatch)
    monkeypatch.setattr(
        render_export_handler.render_export_repository,
        "find_export_asset_by_job_id",
        lambda session, job_id: _asset(),
    )

    result = render_export_handler.process_render_export_job(_message())

    assert result["status"] == "COMPLETED"
    assert result["skipped"] is True
    assert calls["pipeline"] == 0
    assert calls["completed"]["summary"] == {
        "reused": True,
        "assetId": str(ASSET_ID),
    }


def test_process_render_export_job_dispatches_chained_publish(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_job_lifecycle(monkeypatch)
    chained_job = _job(
        JobStatus.QUEUED,
        input_payload={
            "publishTaskId": "00000000-0000-4000-8000-000000000007",
        },
    )
    dispatched: list[tuple[ProcessingJobRow, str]] = []
    monkeypatch.setattr(
        render_export_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: chained_job,
    )
    monkeypatch.setattr(
        render_export_handler,
        "dispatch_chained_publish_job",
        lambda job, *, export_asset_id: dispatched.append((job, export_asset_id)),
    )

    result = render_export_handler.process_render_export_job(_message())

    assert result["status"] == "COMPLETED"
    assert calls["pipeline"] == 1
    assert dispatched == [(chained_job, str(ASSET_ID))]


def test_record_render_export_job_failure_marks_dependent_publish_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, str, str]] = []
    monkeypatch.setattr(render_export_handler, "get_db_session", _session)
    monkeypatch.setattr(
        render_export_handler.jobs_repository,
        "mark_job_failed",
        lambda session, job_id, error_message: calls.append(
            ("job", job_id, error_message)
        ),
    )
    monkeypatch.setattr(
        render_export_handler,
        "record_chained_publish_render_failure",
        lambda job_id, error_message: calls.append(("publish", job_id, error_message)),
    )

    render_export_handler.record_render_export_job_failure(str(JOB_ID), "Render failed")

    assert calls == [
        ("job", str(JOB_ID), "Render failed"),
        ("publish", str(JOB_ID), "Render failed"),
    ]
