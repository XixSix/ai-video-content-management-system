import logging
from typing import Any

from pydantic import ValidationError

from app.core.config import settings
from app.db import jobs_repository, render_export_repository
from app.db.client import get_db_session
from app.errors import TerminalJobError
from app.handlers.publish_handler import (
    dispatch_chained_publish_job,
    record_chained_publish_render_failure,
)
from app.pipelines.render_export.pipeline import run_render_export_pipeline
from app.schemas.db.processsing_job import JobStatus, ProcessingJobRow
from app.schemas.jobs.render_export_message import (
    RenderExportJobMessage,
    RenderExportJobResultMessage,
)
from app.schemas.render_export.input import RenderExportJobInput
from app.schemas.render_export.output import RenderExportJobOutput

logger = logging.getLogger(__name__)


class TerminalRenderExportJobError(TerminalJobError):
    pass


def process_render_export_job(message: RenderExportJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)
    logger.info("Processing render export job job_id=%s", job_id)

    with get_db_session() as session:
        job = _guard_job(message, jobs_repository.find_processing_job(session, job_id))
        _guard_retry_budget(job)

    if _should_skip_job(job):
        _parse_job_input(job)
        return _skipped_result(message, job, job.status)

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(
            session,
            job_id,
            current_step="Queued for render export",
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
            JobStatus.CANCELED,
        }:
            _parse_job_input(current_job)
            return _skipped_result(message, current_job, current_job.status)

        raise TerminalRenderExportJobError(
            "Processing job could not be marked queued",
            error_code="RENDER_EXPORT_JOB_CLAIM_FAILED",
        )

    job_input = _parse_job_input(queued_job)
    existing_asset = _find_existing_asset(job_id)

    if existing_asset:
        output = _completed_output(existing_asset)
        _mark_completed(job_id, output)
        _dispatch_chained_publish_if_needed(queued_job, job_input, output)
        return _result_message(
            message,
            queued_job,
            status=JobStatus.COMPLETED,
            skipped=True,
        )

    _mark_processing_started(job_id)
    output = run_render_export_pipeline(queued_job, job_input=job_input)
    _mark_completed(job_id, output)
    _dispatch_chained_publish_if_needed(queued_job, job_input, output)

    return _result_message(
        message,
        queued_job,
        status=JobStatus.COMPLETED,
        skipped=False,
    )


def record_render_export_job_failure(
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
    record_chained_publish_render_failure(job_id, error_message)


def increment_render_export_job_attempt(job_id: str) -> int | None:
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    return job.attempt_count if job else None


def _guard_job(
    message: RenderExportJobMessage,
    job: ProcessingJobRow | None,
) -> ProcessingJobRow:
    if not job:
        raise TerminalRenderExportJobError(
            "Processing job was not found",
            error_code="RENDER_EXPORT_JOB_NOT_FOUND",
        )

    if job.job_type != message.job_type:
        raise TerminalRenderExportJobError(
            f"Expected {message.job_type.value} job, got {job.job_type.value}",
            error_code="RENDER_EXPORT_JOB_TYPE_MISMATCH",
        )

    if job.task_name != message.task_name:
        raise TerminalRenderExportJobError(
            "Message taskName does not match processing job",
            error_code="RENDER_EXPORT_TASK_NAME_MISMATCH",
        )

    if job.project_id is None:
        raise TerminalRenderExportJobError(
            "Processing job projectId is required",
            error_code="RENDER_EXPORT_PROJECT_REQUIRED",
        )

    if job.status in {JobStatus.FAILED, JobStatus.COMPLETED, JobStatus.CANCELED}:
        raise TerminalRenderExportJobError(
            "Processing job is already terminal",
            error_code="RENDER_EXPORT_JOB_ALREADY_TERMINAL",
        )

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalRenderExportJobError(
            "Processing job exceeded max attempts",
            error_code="RENDER_EXPORT_MAX_ATTEMPTS_EXCEEDED",
        )


def _should_skip_job(job: ProcessingJobRow) -> bool:
    return job.status != JobStatus.PENDING


def _find_existing_asset(
    job_id: str,
) -> render_export_repository.PersistedRenderExportAsset | None:
    with get_db_session() as session:
        return render_export_repository.find_export_asset_by_job_id(session, job_id)


def _mark_processing_started(job_id: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.RUNNING,
            progress=50,
            current_step="Rendering export",
        )


def _mark_completed(job_id: str, output: RenderExportJobOutput) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def _dispatch_chained_publish_if_needed(
    job: ProcessingJobRow,
    job_input: RenderExportJobInput,
    output: RenderExportJobOutput,
) -> None:
    if job_input.publish_task_id is None:
        return

    dispatch_chained_publish_job(
        job,
        publish_task_id=str(job_input.publish_task_id),
        export_asset_id=str(output.asset_id),
    )


def _completed_output(
    asset: render_export_repository.PersistedRenderExportAsset,
) -> RenderExportJobOutput:
    return RenderExportJobOutput(asset_id=asset.id)


def _parse_job_input(job: ProcessingJobRow) -> RenderExportJobInput:
    try:
        return RenderExportJobInput.model_validate(job.input or {})
    except ValidationError as error:
        raise TerminalRenderExportJobError(
            "Processing job input is invalid",
            error_code="RENDER_EXPORT_JOB_INPUT_INVALID",
        ) from error


def _result_message(
    message: RenderExportJobMessage,
    job: ProcessingJobRow,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    result = RenderExportJobResultMessage(
        job_id=message.job_id,
        media_id=job.media_id,
        project_id=job.project_id,
        user_id=job.user_id,
        status=status,
        skipped=skipped,
    )
    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(
    message: RenderExportJobMessage,
    job: ProcessingJobRow,
    status: JobStatus,
) -> dict[str, Any]:
    return _result_message(message, job, status=status, skipped=True)
