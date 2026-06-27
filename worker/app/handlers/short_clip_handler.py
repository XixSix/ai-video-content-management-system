import logging
from typing import Any

from app.core.config import settings
from app.db import jobs_repository, short_clip_repository
from app.db.client import get_db_session
from app.pipelines.short_clip.pipeline import (
    TerminalShortClipPipelineError,
    run_short_clip_pipeline,
)
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.short_clip_message import (
    ShortClipJobMessage,
    ShortClipJobResultMessage,
)
from app.schemas.short_clip.output import (
    ShortClipAssetSummary,
    ShortClipCandidateSummary,
    ShortClipCompletedOutput,
    ShortClipSummary,
)

logger = logging.getLogger(__name__)


class TerminalShortClipJobError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def process_short_clip_job(message: ShortClipJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)
    logger.info(
        "Processing short clip job job_id=%s media_id=%s", job_id, message.media_id
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
            current_step="Queued for short clip generation",
        )

    if not queued_job:
        with get_db_session() as session:
            current_job = _guard_job(
                message, jobs_repository.find_processing_job(session, job_id)
            )

        if current_job.status in {
            JobStatus.GENERATING_SHORT_CLIPS,
            JobStatus.QUEUED,
            JobStatus.COMPLETED,
        }:
            return _skipped_result(message, current_job.status)

        raise TerminalShortClipJobError("Processing job could not be marked queued")

    existing_output = _find_existing_output(job_id, message)

    if existing_output:
        _mark_completed(job_id, existing_output)
        return _result_message(message, status=JobStatus.COMPLETED, skipped=True)

    _mark_processing_started(job_id)

    try:
        output = run_short_clip_pipeline(message)
    except TerminalShortClipPipelineError as error:
        raise TerminalShortClipJobError(
            str(error), error_code=error.error_code
        ) from error

    _mark_completed(job_id, output)
    return _result_message(message, status=JobStatus.COMPLETED, skipped=False)


def record_short_clip_job_failure(job_id: str, error_message: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_failed(session, job_id, error_message)


def increment_short_clip_job_attempt(job_id: str) -> int | None:
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    return job.attempt_count if job else None


def _guard_job(
    message: ShortClipJobMessage, job: ProcessingJobRow | None
) -> ProcessingJobRow:
    if not job:
        raise TerminalShortClipJobError("Processing job was not found")

    if job.job_type != JobType.GENERATE_SHORT_CLIPS:
        raise TerminalShortClipJobError(
            f"Expected GENERATE_SHORT_CLIPS job, got {job.job_type.value}"
        )

    if str(job.media_id) != str(message.media_id):
        raise TerminalShortClipJobError("Message mediaId does not match processing job")

    if str(job.user_id) != str(message.user_id):
        raise TerminalShortClipJobError("Message userId does not match processing job")

    if job.status == JobStatus.FAILED:
        raise TerminalShortClipJobError("Processing job is already failed")

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalShortClipJobError("Processing job exceeded max attempts")


def _should_skip_job(job: ProcessingJobRow) -> bool:
    return job.status != JobStatus.PENDING


def _mark_processing_started(job_id: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.GENERATING_SHORT_CLIPS,
            progress=50,
            current_step="Generating short clips",
        )


def _mark_completed(job_id: str, output: ShortClipCompletedOutput) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def _find_existing_output(
    job_id: str, message: ShortClipJobMessage
) -> ShortClipCompletedOutput | None:
    with get_db_session() as session:
        candidates, short_clips, assets = short_clip_repository.find_output_by_job_id(
            session, job_id
        )

    if not candidates or not short_clips or not assets:
        return None

    return ShortClipCompletedOutput(
        transcript_id=message.transcript_id,
        transcript_version=message.transcript_version,
        candidate_ids=[candidate.id for candidate in candidates],
        short_clip_ids=[short_clip.id for short_clip in short_clips],
        asset_ids=[asset.id for asset in assets],
        candidates=[
            ShortClipCandidateSummary(
                id=candidate.id,
                start_time=candidate.start_time,
                end_time=candidate.end_time,
                duration=candidate.duration,
                title=candidate.title,
                score=candidate.score,
            )
            for candidate in candidates
        ],
        short_clips=[
            ShortClipSummary(
                id=short_clip.id,
                candidate_id=short_clip.candidate_id,
                status=short_clip.status,
            )
            for short_clip in short_clips
        ],
        assets=[
            ShortClipAssetSummary(
                id=asset.id,
                asset_type=asset.asset_type,
                s3_bucket=asset.s3_bucket,
                s3_key=asset.s3_key,
            )
            for asset in assets
        ],
    )


def _result_message(
    message: ShortClipJobMessage,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    result = ShortClipJobResultMessage(
        job_id=message.job_id,
        media_id=message.media_id,
        user_id=message.user_id,
        transcript_id=message.transcript_id,
        transcript_version=message.transcript_version,
        status=status,
        skipped=skipped,
    )
    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(message: ShortClipJobMessage, status: JobStatus) -> dict[str, Any]:
    return _result_message(message, status=status, skipped=True)
