import logging
from typing import Any

from app.core.config import settings
from app.db import jobs_repository, media_preview_repository
from app.db.client import get_db_session
from app.errors import TerminalJobError
from app.pipelines.media_preview.pipeline import run_media_preview_pipeline
from app.schemas.db.processsing_job import JobStatus, ProcessingJobRow
from app.schemas.jobs.media_preview_message import (
    MediaPreviewJobMessage,
    MediaPreviewJobResultMessage,
)
from app.schemas.media_preview.output import MediaPreviewJobOutput

logger = logging.getLogger(__name__)


class TerminalMediaPreviewJobError(TerminalJobError):
    pass


def process_media_preview_job(message: MediaPreviewJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)

    logger.info(
        "Processing media preview job job_id=%s job_type=%s",
        job_id,
        message.job_type.value,
    )

    with get_db_session() as session:
        job = _guard_job(
            message,
            jobs_repository.find_processing_job(session, job_id),
        )
        _guard_retry_budget(job)

    if _should_skip_job(job):
        return _skipped_result(message, job, job.status)

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(
            session,
            job_id,
            current_step="Queued for media preview generation",
        )

    if not queued_job:
        with get_db_session() as session:
            current_job = _guard_job(
                message,
                jobs_repository.find_processing_job(session, job_id),
            )

        if current_job.status in {
            JobStatus.GENERATING_MEDIA_PREVIEW,
            JobStatus.QUEUED,
            JobStatus.COMPLETED,
            JobStatus.CANCELED,
        }:
            return _skipped_result(message, current_job, current_job.status)

        raise TerminalMediaPreviewJobError(
            "Processing job could not be marked queued",
            error_code="MEDIA_PREVIEW_JOB_CLAIM_FAILED",
        )

    existing_assets = _find_existing_assets(job_id)

    if existing_assets:
        output = _completed_output(existing_assets)
        _mark_completed(job_id, output)
        return _result_message(
            message,
            queued_job,
            status=JobStatus.COMPLETED,
            skipped=True,
        )

    _mark_processing_started(job_id)

    output = run_media_preview_pipeline(queued_job)

    _mark_completed(job_id, output)

    return _result_message(
        message,
        queued_job,
        status=JobStatus.COMPLETED,
        skipped=False,
    )


def record_media_preview_job_failure(
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


def increment_media_preview_job_attempt(job_id: str) -> int | None:
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    return job.attempt_count if job else None


def _guard_job(
    message: MediaPreviewJobMessage,
    job: ProcessingJobRow | None,
) -> ProcessingJobRow:
    """Reject jobs that are missing, mismatched, failed, or the wrong type."""
    if not job:
        raise TerminalMediaPreviewJobError(
            "Processing job was not found",
            error_code="MEDIA_PREVIEW_JOB_NOT_FOUND",
        )

    if job.job_type != message.job_type:
        raise TerminalMediaPreviewJobError(
            f"Expected {message.job_type.value} job, got {job.job_type.value}",
            error_code="MEDIA_PREVIEW_JOB_TYPE_MISMATCH",
        )

    if job.task_name != message.task_name:
        raise TerminalMediaPreviewJobError(
            "Message taskName does not match processing job",
            error_code="MEDIA_PREVIEW_TASK_NAME_MISMATCH",
        )

    if job.status in {JobStatus.FAILED, JobStatus.COMPLETED, JobStatus.CANCELED}:
        raise TerminalMediaPreviewJobError(
            "Processing job is already terminal",
            error_code="MEDIA_PREVIEW_JOB_ALREADY_TERMINAL",
        )

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    """Reject a job when the worker retry budget is already exhausted."""
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalMediaPreviewJobError(
            "Processing job exceeded max attempts",
            error_code="MEDIA_PREVIEW_MAX_ATTEMPTS_EXCEEDED",
        )


def _should_skip_job(job: ProcessingJobRow) -> bool:
    """Return whether a job should be skipped because it is not pending."""
    return job.status != JobStatus.PENDING


def _find_existing_assets(
    job_id: str,
) -> list[media_preview_repository.PersistedMediaPreviewAsset]:
    with get_db_session() as session:
        return media_preview_repository.find_assets_by_job_id(session, job_id)


def _mark_processing_started(job_id: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.GENERATING_MEDIA_PREVIEW,
            progress=50,
            current_step="Processing media preview",
        )


def _mark_completed(job_id: str, output: MediaPreviewJobOutput) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def _completed_output(
    assets: list[media_preview_repository.PersistedMediaPreviewAsset],
) -> MediaPreviewJobOutput:
    asset_ids = [asset.id for asset in assets]
    return MediaPreviewJobOutput(
        asset_count=len(asset_ids),
        asset_ids=asset_ids,
    )


def _result_message(
    message: MediaPreviewJobMessage,
    job: ProcessingJobRow,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    result = MediaPreviewJobResultMessage(
        job_id=message.job_id,
        media_id=job.media_id,
        user_id=job.user_id,
        status=status,
        skipped=skipped,
    )
    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(
    message: MediaPreviewJobMessage,
    job: ProcessingJobRow,
    status: JobStatus,
) -> dict[str, Any]:
    return _result_message(
        message,
        job,
        status=status,
        skipped=True,
    )
