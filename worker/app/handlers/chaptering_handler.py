import logging
from typing import Any

from app.core.config import settings
from app.db import jobs_repository, chaptering_repository
from app.db.client import get_db_session
from app.pipelines.chaptering.pipeline import run_chaptering_pipeline
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.chaptering_message import (
    ChapteringJobMessage,
    ChapteringJobResultMessage,
)
from app.schemas.chaptering.output import (
    ChapteringCompletedOutput,
    ChapteringJobOptions,
    ChapteringOutputSummary,
)

logger = logging.getLogger(__name__)


class TerminalChapteringJobError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def process_chaptering_job(message: ChapteringJobMessage) -> dict[str, Any]:
    """Claim and validate a chaptering job before delegating pipeline work."""
    job_id = str(message.job_id)

    logger.info(
        "Processing chaptering job job_id=%s media_id=%s", job_id, message.media_id
    )

    with get_db_session() as session:
        job = _guard_job(message, jobs_repository.find_processing_job(session, job_id))
        _guard_retry_budget(job)

    if _should_skip_job(job):
        return _skipped_result(message, job.status)

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(session, job_id)

    if not queued_job:
        # Another worker may have claimed the job between validation and update.
        with get_db_session() as session:
            current_job = _guard_job(
                message, jobs_repository.find_processing_job(session, job_id)
            )

        if current_job.status in {
            JobStatus.GENERATING_CHAPTERS,
            JobStatus.QUEUED,
            JobStatus.COMPLETED,
        }:
            return _skipped_result(message, current_job.status)

        raise TerminalChapteringJobError("Processing job could not be marked queued")

    options = ChapteringJobOptions.model_validate(queued_job.input or {})
    existing_chaptering = _find_existing_chaptering(job_id)

    if existing_chaptering:
        output = _completed_output(
            existing_chaptering,
            options=options,
        )
        _mark_completed(job_id, output)
        return _result_message(message, status=JobStatus.COMPLETED, skipped=True)

    _mark_processing_started(job_id)

    output = run_chaptering_pipeline(message, options=options)

    _mark_completed(job_id, output)

    return _result_message(
        message,
        status=JobStatus.COMPLETED,
        skipped=False,
    )


def _mark_processing_started(job_id: str) -> None:
    """Mark a chaptering job as running with coarse MVP progress."""
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.GENERATING_CHAPTERS,
            progress=50,
            current_step="Processing chaptering",
        )


def _mark_completed(job_id: str, output: ChapteringCompletedOutput) -> None:
    """Persist the completed chaptering output payload for a job."""
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def record_chaptering_job_failure(job_id: str, error_message: str) -> None:
    """Record a terminal chaptering job failure for consumer error paths."""
    with get_db_session() as session:
        jobs_repository.mark_job_failed(session, job_id, error_message)


def increment_chaptering_job_attempt(job_id: str) -> int | None:
    """Increment a chaptering job retry counter and return the latest count."""
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    if not job:
        return None

    return job.attempt_count


def _guard_job(
    message: ChapteringJobMessage, job: ProcessingJobRow | None
) -> ProcessingJobRow:
    """Reject jobs that are missing, mismatched, failed, or the wrong type."""
    if not job:
        raise TerminalChapteringJobError("Processing job was not found")

    if job.job_type != JobType.GENERATE_CHAPTERS:
        raise TerminalChapteringJobError(
            f"Expected GENERATE_CHAPTERS job, got {job.job_type.value}"
        )

    if str(job.media_id) != str(message.media_id):
        raise TerminalChapteringJobError(
            "Message mediaId does not match processing job"
        )

    if str(job.user_id) != str(message.user_id):
        raise TerminalChapteringJobError("Message userId does not match processing job")

    if job.status == JobStatus.FAILED:
        raise TerminalChapteringJobError("Processing job is already failed")

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    """Reject a job when the worker retry budget is already exhausted."""
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalChapteringJobError("Processing job exceeded max attempts")


def _should_skip_job(job: ProcessingJobRow) -> bool:
    """Return whether a job should be skipped because it is not pending."""
    return job.status != JobStatus.PENDING


def _find_existing_chaptering(
    job_id: str,
) -> chaptering_repository.PersistedChapteringSummary | None:
    """Return an existing chaptering for idempotent chaptering job handling."""
    with get_db_session() as session:
        return chaptering_repository.find_chaptering_by_job_id(session, job_id)


def _completed_output(
    chaptering: chaptering_repository.PersistedChapteringSummary,
    *,
    options: ChapteringJobOptions,
) -> ChapteringCompletedOutput:
    """Build completed output for an already persisted chaptering."""
    chapters = [
        ChapteringOutputSummary(
            id=chapter.id,
            chapter_index=chapter.chapter_index,
            start_time=chapter.start_time,
            end_time=chapter.end_time,
            title=chapter.title,
            summary=chapter.summary,
            transcript_version=chapter.transcript_version,
            source=chapter.source,
            score=chapter.score,
            boundary_score=chapter.boundary_score,
            pause_score=chapter.pause_score,
            discourse_marker_score=chapter.discourse_marker_score,
            semantic_shift_score=chapter.semantic_shift_score,
            duration_score=chapter.duration_score,
        )
        for chapter in chaptering.chapters
    ]

    return ChapteringCompletedOutput(
        transcript_id=chaptering.transcript_id,
        transcript_version=chaptering.transcript_version,
        model=chaptering.model,
        chapter_count=len(chapters),
        chapters=chapters,
        options=options,
    )


def _result_message(
    message: ChapteringJobMessage,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    """Build the queue result message with API-compatible JSON aliases."""
    result = ChapteringJobResultMessage(
        job_id=message.job_id,
        media_id=message.media_id,
        user_id=message.user_id,
        transcript_id=message.transcript_id,
        transcript_version=message.transcript_version,
        status=status,
        skipped=skipped,
    )

    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(message: ChapteringJobMessage, status: JobStatus) -> dict[str, Any]:
    """Build a skipped chaptering result for already claimed or completed jobs."""
    return _result_message(message, status=status, skipped=True)
