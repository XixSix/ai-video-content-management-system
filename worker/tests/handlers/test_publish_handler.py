from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db.publish_repository import (
    PlatformAccountRow,
    PublishSourceRow,
    PublishTaskRow,
)
from app.handlers import publish_handler
from app.pipelines.publish import pipeline as publish_pipeline
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.publish_message import PublishJobMessage
from app.services.publish_provider import PublishProviderResult

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
PUBLISH_TASK_ID = UUID("00000000-0000-4000-8000-000000000002")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000003")
USER_ID = UUID("00000000-0000-4000-8000-000000000004")
PLATFORM_ACCOUNT_ID = UUID("00000000-0000-4000-8000-000000000005")
WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000006")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> PublishJobMessage:
    return PublishJobMessage.model_validate(
        {
            "version": 1,
            "jobId": str(JOB_ID),
            "jobType": "PUBLISH",
            "taskName": "publish",
        }
    )


def _job(status: JobStatus = JobStatus.PENDING) -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "projectId": None,
            "jobType": JobType.PUBLISH,
            "status": status,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": "publish_queue",
            "taskName": "publish",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": {"publishTaskId": str(PUBLISH_TASK_ID)},
            "output": None,
            "createdAt": "2026-06-26T00:00:00Z",
            "updatedAt": "2026-06-26T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _task(status: str = "DRAFT") -> PublishTaskRow:
    return PublishTaskRow(
        id=PUBLISH_TASK_ID,
        user_id=USER_ID,
        media_id=MEDIA_ID,
        project_id=None,
        short_clip_id=None,
        platform_account_id=PLATFORM_ACCOUNT_ID,
        job_id=JOB_ID,
        platform="FACEBOOK",
        status=status,
        title="Title",
        caption="Caption",
        description=None,
        hashtags=["#video"],
        platform_post_id=None,
        platform_post_url=None,
    )


def _account() -> PlatformAccountRow:
    return PlatformAccountRow(
        id=PLATFORM_ACCOUNT_ID,
        workspace_id=WORKSPACE_ID,
        platform="FACEBOOK",
        platform_user_id="facebook-page-id",
        status="CONNECTED",
        access_token_encrypted="encrypted-token",
        refresh_token_encrypted=None,
        expires_at=None,
    )


def _source() -> PublishSourceRow:
    return PublishSourceRow(
        id=MEDIA_ID,
        source_type="MEDIA",
        s3_bucket="vidpilot-media",
        s3_key="media/video.mp4",
        mime_type="video/mp4",
        file_size_bytes=1024,
        filename="video.mp4",
    )


class _Provider:
    def publish(self, payload: object) -> PublishProviderResult:
        return PublishProviderResult(
            platform_post_id="mock-facebook-post",
            platform_post_url="https://mock.publish.local/facebook/post",
        )


def _patch_publish_lifecycle(monkeypatch: pytest.MonkeyPatch) -> dict[str, object]:
    calls: dict[str, object] = {
        "completed": None,
        "failed": [],
        "published": None,
        "publishing": None,
        "steps": [],
    }
    monkeypatch.setattr(publish_handler, "get_db_session", _session)
    monkeypatch.setattr(publish_pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "mark_job_step",
        lambda session, job_id, **kwargs: calls["steps"].append(kwargs),
    )
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "mark_job_completed",
        lambda session, job_id, *, output: calls.update(completed=output),
    )
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "mark_job_failed",
        lambda session, job_id, error_message, *, error_code=None: calls[
            "failed"
        ].append((job_id, error_message, error_code)),
    )
    monkeypatch.setattr(
        publish_pipeline.publish_repository,
        "find_publish_task",
        lambda session, publish_task_id: _task(),
    )
    monkeypatch.setattr(
        publish_pipeline.publish_repository,
        "find_platform_account",
        lambda session, platform_account_id: _account(),
    )
    monkeypatch.setattr(
        publish_pipeline.publish_repository,
        "find_publish_source",
        lambda session, task, *, export_asset_id: _source(),
    )
    monkeypatch.setattr(
        publish_pipeline.publish_repository,
        "mark_publish_task_publishing",
        lambda session, publish_task_id, job_id: calls.update(
            publishing=(publish_task_id, job_id)
        ),
    )
    monkeypatch.setattr(
        publish_pipeline.publish_repository,
        "mark_publish_task_published",
        lambda session, publish_task_id, **kwargs: calls.update(
            published=(publish_task_id, kwargs)
        ),
    )
    monkeypatch.setattr(
        publish_pipeline,
        "get_publish_provider",
        lambda platform: _Provider(),
    )
    return calls


def test_process_publish_job_marks_task_and_job_completed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_publish_lifecycle(monkeypatch)

    result = publish_handler.process_publish_job(_message())

    assert result["status"] == "COMPLETED"
    assert result["skipped"] is False
    assert calls["publishing"] == (str(PUBLISH_TASK_ID), str(JOB_ID))
    assert calls["published"] == (
        str(PUBLISH_TASK_ID),
        {
            "platform_post_id": "mock-facebook-post",
            "platform_post_url": "https://mock.publish.local/facebook/post",
        },
    )
    assert calls["completed"] == {
        "type": "publish.job.output",
        "version": 1,
        "publishTaskId": str(PUBLISH_TASK_ID),
    }


def test_process_publish_job_skips_canceled_publish_task(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_publish_lifecycle(monkeypatch)
    monkeypatch.setattr(
        publish_pipeline.publish_repository,
        "find_publish_task",
        lambda session, publish_task_id: _task("CANCELED"),
    )

    with pytest.raises(publish_pipeline.TerminalPublishPipelineError) as error:
        publish_handler.process_publish_job(_message())

    assert error.value.error_code == "PUBLISH_TASK_CANCELED"
    assert calls["failed"] == []


def test_record_publish_job_failure_marks_task_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {"job": None, "task": None}
    monkeypatch.setattr(publish_handler, "get_db_session", _session)
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "mark_job_failed",
        lambda session, job_id, error_message, *, error_code=None: calls.update(
            job=(job_id, error_message, error_code)
        ),
    )
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        publish_handler.publish_repository,
        "mark_publish_task_failed",
        lambda session, publish_task_id: calls.update(task=publish_task_id),
    )

    publish_handler.record_publish_job_failure(
        str(JOB_ID),
        "Provider unavailable",
        error_code="PUBLISH_PROVIDER_TERMINAL",
    )

    assert calls["job"] == (
        str(JOB_ID),
        "Provider unavailable",
        "PUBLISH_PROVIDER_TERMINAL",
    )
    assert calls["task"] == str(PUBLISH_TASK_ID)
