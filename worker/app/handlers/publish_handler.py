import logging
from typing import Any

from pydantic import ValidationError

from app.core.celery_app import celery_app
from app.core.config import settings
from app.db import jobs_repository, publish_repository
from app.db.client import get_db_session
from app.errors import TerminalJobError
from app.pipelines.publish.pipeline import run_publish_pipeline
from app.schemas.db.processsing_job import JobStatus, ProcessingJobRow
from app.schemas.jobs.publish_message import (
    PublishJobMessage,
    PublishJobResultMessage,
)
from app.schemas.publish.input import PublishJobInput

logger = logging.getLogger(__name__)


class TerminalPublishJobError(TerminalJobError):
    pass


def process_publish_job(message: PublishJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)
    logger.info("Processing publish job job_id=%s", job_id)

    with get_db_session() as session:
        job = _guard_job(message, jobs_repository.find_processing_job(session, job_id))
        _guard_retry_budget(job)

    if _should_skip_job(job):
        job_input = _parse_job_input(job)
        return _skipped_result(message, job, job_input, job.status)

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
            job_input = _parse_job_input(current_job)
            return _skipped_result(message, current_job, job_input, current_job.status)

        raise TerminalPublishJobError(
            "Processing job could not be marked queued",
            error_code="PUBLISH_JOB_CLAIM_FAILED",
        )

    _mark_processing_started(job_id)
    job_input = _parse_job_input(queued_job)
    result = run_publish_pipeline(queued_job, job_input=job_input)

    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=result.output.model_dump(mode="json", by_alias=True),
        )

    return _result_message(
        message,
        queued_job,
        job_input,
        status=JobStatus.COMPLETED,
        skipped=result.skipped,
    )


def record_publish_job_failure(
    job_id: str,
    error_message: str,
    *,
    error_code: str | None = None,
) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_failed(
            session,
            job_id,
            error_message,
            error_code=error_code,
        )
        job = jobs_repository.find_processing_job(session, job_id)
        publish_task_id = _publish_task_id_from_job(job)

        if publish_task_id is not None:
            publish_repository.mark_publish_task_failed(
                session,
                publish_task_id,
            )


def increment_publish_job_attempt(job_id: str) -> int | None:
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    return job.attempt_count if job else None


def dispatch_chained_publish_job(
    render_job: ProcessingJobRow,
    *,
    publish_task_id: str,
    export_asset_id: str,
) -> None:
    with get_db_session() as session:
        scheduled_at = publish_repository.find_publish_task_scheduled_at(
            session,
            publish_task_id,
        )
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


def record_chained_publish_render_failure(job_id: str, _error_message: str) -> None:
    with get_db_session() as session:
        publish_repository.mark_publish_task_failed_for_render_job(
            session,
            job_id,
        )


def _guard_job(
    message: PublishJobMessage,
    job: ProcessingJobRow | None,
) -> ProcessingJobRow:
    if not job:
        raise TerminalPublishJobError(
            "Processing job was not found",
            error_code="PUBLISH_JOB_NOT_FOUND",
        )

    if job.job_type != message.job_type:
        raise TerminalPublishJobError(
            f"Expected {message.job_type.value} job, got {job.job_type.value}",
            error_code="PUBLISH_JOB_TYPE_MISMATCH",
        )

    if job.task_name != message.task_name:
        raise TerminalPublishJobError(
            "Message taskName does not match processing job",
            error_code="PUBLISH_TASK_NAME_MISMATCH",
        )

    if job.status in {JobStatus.FAILED, JobStatus.COMPLETED, JobStatus.CANCELED}:
        raise TerminalPublishJobError(
            "Processing job is already terminal",
            error_code="PUBLISH_JOB_ALREADY_TERMINAL",
        )

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalPublishJobError(
            "Processing job exceeded max attempts",
            error_code="PUBLISH_MAX_ATTEMPTS_EXCEEDED",
        )


def _publish_task_id_from_job(job: ProcessingJobRow | None) -> str | None:
    if not job or not isinstance(job.input, dict):
        return None

    publish_task_id = job.input.get("publishTaskId")
    return publish_task_id if isinstance(publish_task_id, str) else None


def _parse_job_input(job: ProcessingJobRow) -> PublishJobInput:
    try:
        return PublishJobInput.model_validate(job.input or {})
    except ValidationError as error:
        raise TerminalPublishJobError(
            "Processing job input is invalid",
            error_code="PUBLISH_JOB_INPUT_INVALID",
        ) from error


def _should_skip_job(job: ProcessingJobRow) -> bool:
    return job.status != JobStatus.PENDING


def _mark_processing_started(job_id: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.PUBLISHING,
            progress=70,
            current_step="Publishing to platform",
        )


def _result_message(
    message: PublishJobMessage,
    job: ProcessingJobRow,
    job_input: PublishJobInput,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    result = PublishJobResultMessage(
        job_id=message.job_id,
        publish_task_id=job_input.publish_task_id,
        user_id=job.user_id,
        status=status,
        skipped=skipped,
    )
    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(
    message: PublishJobMessage,
    job: ProcessingJobRow,
    job_input: PublishJobInput,
    status: JobStatus,
) -> dict[str, Any]:
    return _result_message(message, job, job_input, status=status, skipped=True)
