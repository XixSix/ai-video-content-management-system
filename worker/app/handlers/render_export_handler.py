import logging
from typing import Any

from app.core.config import settings
from app.db import jobs_repository, render_export_repository
from app.db.client import get_db_session
from app.handlers.publish_handler import (
    dispatch_chained_publish_job,
    record_chained_publish_render_failure,
)
from app.pipelines.render_export.pipeline import run_render_export_pipeline
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.render_export_message import (
    RenderExportJobMessage,
    RenderExportJobResultMessage,
)
from app.schemas.render_export.output import (
    RenderExportAssetSummary,
    RenderExportCompletedOutput,
)

logger = logging.getLogger(__name__)


class TerminalRenderExportJobError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def process_render_export_job(message: RenderExportJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)
    logger.info(
        "Processing render export job job_id=%s project_id=%s media_id=%s",
        job_id,
        message.project_id,
        message.media_id,
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
        }:
            return _skipped_result(message, current_job.status)

        raise TerminalRenderExportJobError("Processing job could not be marked queued")

    existing_asset = _find_existing_asset(job_id)

    if existing_asset:
        output = _completed_output(existing_asset, summary={"reused": True})
        _mark_completed(job_id, output)
        _dispatch_chained_publish_if_needed(queued_job, output)
        return _result_message(message, status=JobStatus.COMPLETED, skipped=True)

    _mark_processing_started(job_id)
    output = run_render_export_pipeline(message)
    _mark_completed(job_id, output)
    _dispatch_chained_publish_if_needed(queued_job, output)

    return _result_message(message, status=JobStatus.COMPLETED, skipped=False)


def record_render_export_job_failure(job_id: str, error_message: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_failed(session, job_id, error_message)
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
        raise TerminalRenderExportJobError("Processing job was not found")

    if job.job_type != JobType.EXPORT_RENDER:
        raise TerminalRenderExportJobError(
            f"Expected EXPORT_RENDER job, got {job.job_type.value}"
        )

    if str(job.media_id) != str(message.media_id):
        raise TerminalRenderExportJobError(
            "Message mediaId does not match processing job"
        )

    if str(job.user_id) != str(message.user_id):
        raise TerminalRenderExportJobError(
            "Message userId does not match processing job"
        )

    if job.project_id is None or str(job.project_id) != str(message.project_id):
        raise TerminalRenderExportJobError(
            "Message projectId does not match processing job"
        )

    if job.status == JobStatus.FAILED:
        raise TerminalRenderExportJobError("Processing job is already failed")

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalRenderExportJobError("Processing job exceeded max attempts")


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


def _mark_completed(job_id: str, output: RenderExportCompletedOutput) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def _dispatch_chained_publish_if_needed(
    job: ProcessingJobRow,
    output: RenderExportCompletedOutput,
) -> None:
    asset_id = str(output.asset.id)
    dispatch_chained_publish_job(job, export_asset_id=asset_id)


def _completed_output(
    asset: render_export_repository.PersistedRenderExportAsset,
    *,
    summary: dict[str, Any],
) -> RenderExportCompletedOutput:
    return RenderExportCompletedOutput(
        asset=RenderExportAssetSummary(
            id=asset.id,
            asset_type=asset.asset_type,
            s3_bucket=asset.s3_bucket,
            s3_key=asset.s3_key,
            metadata=asset.metadata,
        ),
        summary=summary | {"assetId": str(asset.id)},
    )


def _result_message(
    message: RenderExportJobMessage,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    result = RenderExportJobResultMessage(
        job_id=message.job_id,
        media_id=message.media_id,
        project_id=message.project_id,
        user_id=message.user_id,
        status=status,
        skipped=skipped,
    )
    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(
    message: RenderExportJobMessage, status: JobStatus
) -> dict[str, Any]:
    return _result_message(message, status=status, skipped=True)
