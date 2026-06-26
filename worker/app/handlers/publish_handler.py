import logging
from datetime import datetime
from typing import Any

from app.core.celery_app import celery_app
from app.core.config import settings
from app.db import jobs_repository, publish_repository
from app.db.client import get_db_session
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.publish_message import (
    PublishJobMessage,
    PublishJobResultMessage,
)
from app.services.mock_publish_provider import mock_publish_provider

logger = logging.getLogger(__name__)


class TerminalPublishJobError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def process_publish_job(message: PublishJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)
    logger.info(
        "Processing publish job job_id=%s publish_task_id=%s",
        job_id,
        message.publish_task_id,
    )

    with get_db_session() as session:
        job = _guard_job(message, jobs_repository.find_processing_job(session, job_id))
        _guard_retry_budget(job)

    if _should_skip_job(job):
        return _skipped_result(message, job.status)

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(
            session,
            job_id,
            current_step="Queued for publish",
        )

    if not queued_job:
        with get_db_session() as session:
            current_job = _guard_job(
                message,
                jobs_repository.find_processing_job(session, job_id),
            )

        if current_job.status in {
            JobStatus.RUNNING,
            JobStatus.QUEUED,
            JobStatus.COMPLETED,
            JobStatus.FAILED,
            JobStatus.CANCELED,
        }:
            return _skipped_result(message, current_job.status)

        raise TerminalPublishJobError("Processing job could not be marked queued")

    with get_db_session() as session:
        task = publish_repository.find_publish_task(
            session,
            str(message.publish_task_id),
        )

        if task is None:
            raise TerminalPublishJobError("Publish task was not found")

        if task.status == "CANCELED":
            jobs_repository.mark_job_failed(
                session, job_id, "Publish task was canceled"
            )
            return _skipped_result(message, JobStatus.FAILED)

        _guard_publish_task(message, task)
        _guard_platform_account(session, message, task)

        if not publish_repository.target_exists_for_publish_task(
            session,
            task,
            export_asset_id=str(message.export_asset_id)
            if message.export_asset_id
            else None,
        ):
            raise TerminalPublishJobError("Publish target was not found")

        publish_repository.mark_publish_task_publishing(
            session,
            str(message.publish_task_id),
            job_id,
        )
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.PUBLISHING,
            progress=70,
            current_step="Publishing to platform",
        )

    result = mock_publish_provider.publish(
        platform=message.platform,
        publish_task_id=message.publish_task_id,
    )
    output = {
        "publishTaskId": str(message.publish_task_id),
        "platform": message.platform,
        "platformPostId": result.platform_post_id,
        "platformPostUrl": result.platform_post_url,
    }

    with get_db_session() as session:
        publish_repository.mark_publish_task_published(
            session,
            str(message.publish_task_id),
            platform_post_id=result.platform_post_id,
            platform_post_url=result.platform_post_url,
        )
        jobs_repository.mark_job_completed(session, job_id, output=output)

    return _result_message(message, status=JobStatus.COMPLETED, skipped=False)


def record_publish_job_failure(job_id: str, error_message: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_failed(session, job_id, error_message)
        job = jobs_repository.find_processing_job(session, job_id)
        publish_task_id = _publish_task_id_from_job(job)

        if publish_task_id is not None:
            publish_repository.mark_publish_task_failed(
                session,
                publish_task_id,
                error_message,
            )


def increment_publish_job_attempt(job_id: str) -> int | None:
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    return job.attempt_count if job else None


def dispatch_chained_publish_job(
    render_job: ProcessingJobRow,
    *,
    export_asset_id: str,
) -> None:
    publish_task_id = _publish_task_id_from_job(render_job)

    if publish_task_id is None:
        return

    scheduled_at = _publish_scheduled_at_from_job(render_job)

    with get_db_session() as session:
        dispatch = publish_repository.create_publish_job_from_render(
            session,
            render_job=render_job,
            publish_task_id=publish_task_id,
            export_asset_id=export_asset_id,
            scheduled_at=scheduled_at,
        )

    if dispatch is None:
        return

    celery_app.send_task(
        settings.publish_task_name,
        kwargs=dispatch.message,
        queue=settings.publish_queue_name,
        routing_key=settings.publish_queue_name,
        task_id=str(dispatch.job.id),
        eta=dispatch.eta,
    )


def record_chained_publish_render_failure(job_id: str, error_message: str) -> None:
    with get_db_session() as session:
        publish_repository.mark_publish_task_failed_for_render_job(
            session,
            job_id,
            error_message,
        )


def _guard_job(
    message: PublishJobMessage,
    job: ProcessingJobRow | None,
) -> ProcessingJobRow:
    if not job:
        raise TerminalPublishJobError("Processing job was not found")

    if job.job_type != JobType.PUBLISH:
        raise TerminalPublishJobError(f"Expected PUBLISH job, got {job.job_type.value}")

    if message.media_id is not None and str(job.media_id) != str(message.media_id):
        raise TerminalPublishJobError("Message mediaId does not match processing job")

    if str(job.user_id) != str(message.user_id):
        raise TerminalPublishJobError("Message userId does not match processing job")

    if message.project_id and (
        job.project_id is None or str(job.project_id) != str(message.project_id)
    ):
        raise TerminalPublishJobError("Message projectId does not match processing job")

    if job.status == JobStatus.FAILED:
        raise TerminalPublishJobError("Processing job is already failed")

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalPublishJobError("Processing job exceeded max attempts")


def _guard_publish_task(
    message: PublishJobMessage,
    task: publish_repository.PublishTaskRow,
) -> None:
    if str(task.user_id) != str(message.user_id):
        raise TerminalPublishJobError("Message userId does not match publish task")

    if task.platform != message.platform:
        raise TerminalPublishJobError("Message platform does not match publish task")

    if task.platform_account_id is None or str(task.platform_account_id) != str(
        message.platform_account_id
    ):
        raise TerminalPublishJobError(
            "Message platformAccountId does not match publish task"
        )

    if _uuid_or_none(task.media_id) != _uuid_or_none(message.media_id):
        raise TerminalPublishJobError("Message mediaId does not match publish task")

    if _uuid_or_none(task.project_id) != _uuid_or_none(message.project_id):
        raise TerminalPublishJobError("Message projectId does not match publish task")

    if _uuid_or_none(task.short_clip_id) != _uuid_or_none(message.short_clip_id):
        raise TerminalPublishJobError("Message shortClipId does not match publish task")


def _guard_platform_account(
    session: Any,
    message: PublishJobMessage,
    task: publish_repository.PublishTaskRow,
) -> None:
    account = publish_repository.find_platform_account(
        session,
        str(message.platform_account_id),
    )

    if account is None:
        raise TerminalPublishJobError("Platform account was not found")

    if account.platform != task.platform or account.status != "CONNECTED":
        raise TerminalPublishJobError("Platform account cannot publish this task")


def _publish_task_id_from_job(job: ProcessingJobRow | None) -> str | None:
    if not job or not isinstance(job.input, dict):
        return None

    publish_task_id = job.input.get("publishTaskId")
    return publish_task_id if isinstance(publish_task_id, str) else None


def _publish_scheduled_at_from_job(job: ProcessingJobRow) -> datetime | None:
    if not isinstance(job.input, dict):
        return None

    scheduled_at = job.input.get("publishScheduledAt")

    if not isinstance(scheduled_at, str) or not scheduled_at:
        return None

    return datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))


def _should_skip_job(job: ProcessingJobRow) -> bool:
    return job.status != JobStatus.PENDING


def _uuid_or_none(value: object) -> str | None:
    return str(value) if value is not None else None


def _result_message(
    message: PublishJobMessage,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    result = PublishJobResultMessage(
        job_id=message.job_id,
        publish_task_id=message.publish_task_id,
        user_id=message.user_id,
        status=status,
        skipped=skipped,
    )
    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(message: PublishJobMessage, status: JobStatus) -> dict[str, Any]:
    return _result_message(message, status=status, skipped=True)
