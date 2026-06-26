from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db.publish_repository import PlatformAccountRow, PublishTaskRow
from app.handlers import publish_handler
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.publish_message import PublishJobMessage
from app.services.mock_publish_provider import MockPublishResult

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
            "jobId": str(JOB_ID),
            "publishTaskId": str(PUBLISH_TASK_ID),
            "mediaId": str(MEDIA_ID),
            "projectId": None,
            "shortClipId": None,
            "exportAssetId": None,
            "userId": str(USER_ID),
            "platform": "FACEBOOK",
            "platformAccountId": str(PLATFORM_ACCOUNT_ID),
            "scheduledAt": None,
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
            "taskName": "publish_task",
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
    )


def _account() -> PlatformAccountRow:
    return PlatformAccountRow(
        id=PLATFORM_ACCOUNT_ID,
        workspace_id=WORKSPACE_ID,
        platform="FACEBOOK",
        status="CONNECTED",
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
        lambda session, job_id, error_message: calls["failed"].append(
            (job_id, error_message)
        ),
    )
    monkeypatch.setattr(
        publish_handler.publish_repository,
        "find_publish_task",
        lambda session, publish_task_id: _task(),
    )
    monkeypatch.setattr(
        publish_handler.publish_repository,
        "find_platform_account",
        lambda session, platform_account_id: _account(),
    )
    monkeypatch.setattr(
        publish_handler.publish_repository,
        "target_exists_for_publish_task",
        lambda session, task, *, export_asset_id: True,
    )
    monkeypatch.setattr(
        publish_handler.publish_repository,
        "mark_publish_task_publishing",
        lambda session, publish_task_id, job_id: calls.update(
            publishing=(publish_task_id, job_id)
        ),
    )
    monkeypatch.setattr(
        publish_handler.publish_repository,
        "mark_publish_task_published",
        lambda session, publish_task_id, **kwargs: calls.update(
            published=(publish_task_id, kwargs)
        ),
    )
    monkeypatch.setattr(
        publish_handler.mock_publish_provider,
        "publish",
        lambda *, platform, publish_task_id: MockPublishResult(
            platform_post_id="mock-facebook-post",
            platform_post_url="https://mock.publish.local/facebook/post",
        ),
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
    assert calls["completed"]["platformPostId"] == "mock-facebook-post"


def test_process_publish_job_skips_canceled_publish_task(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _patch_publish_lifecycle(monkeypatch)
    monkeypatch.setattr(
        publish_handler.publish_repository,
        "find_publish_task",
        lambda session, publish_task_id: _task("CANCELED"),
    )

    result = publish_handler.process_publish_job(_message())

    assert result["skipped"] is True
    assert calls["failed"] == [(str(JOB_ID), "Publish task was canceled")]


def test_record_publish_job_failure_marks_task_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {"job": None, "task": None}
    monkeypatch.setattr(publish_handler, "get_db_session", _session)
    monkeypatch.setattr(
        publish_handler.jobs_repository,
        "mark_job_failed",
        lambda session, job_id, error_message: calls.update(
            job=(job_id, error_message)
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
        lambda session, publish_task_id, error_message: calls.update(
            task=(publish_task_id, error_message)
        ),
    )

    publish_handler.record_publish_job_failure(str(JOB_ID), "Provider unavailable")

    assert calls["job"] == (str(JOB_ID), "Provider unavailable")
    assert calls["task"] == (str(PUBLISH_TASK_ID), "Provider unavailable")
