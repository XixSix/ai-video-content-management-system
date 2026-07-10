import logging
from typing import Any

from pydantic import ValidationError

from app.core.config import settings
from app.db import chapters_repository, jobs_repository
from app.db.client import get_db_session
from app.errors import TerminalJobError
from app.pipelines.generate_chapters.pipeline import run_generate_chapters_pipeline
from app.schemas.chapters.input import GenerateChaptersJobInput
from app.schemas.chapters.output import GenerateChaptersJobOutput
from app.schemas.db.processsing_job import JobStatus, ProcessingJobRow
from app.schemas.jobs.generate_chapters_message import (
    GenerateChaptersJobMessage,
    GenerateChaptersJobResultMessage,
)

logger = logging.getLogger(__name__)


class TerminalGenerateChaptersJobError(TerminalJobError):
    pass


def process_generate_chapters_job(
    message: GenerateChaptersJobMessage,
) -> dict[str, Any]:
    """Claim and validate a generate chapters job before delegating AI work."""
    job_id = str(message.job_id)

    logger.info("Processing generate chapters job job_id=%s", job_id)

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
            current_step="Queued for chapter generation",
        )

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
            JobStatus.CANCELED,
        }:
            job_input = _parse_job_input(current_job)
            return _skipped_result(message, current_job, job_input, current_job.status)

        raise TerminalGenerateChaptersJobError(
            "Processing job could not be marked queued",
            error_code="GENERATE_CHAPTERS_JOB_CLAIM_FAILED",
        )

    job_input = _parse_job_input(queued_job)
    options = job_input.options
    existing_chapters = _find_existing_chapters(job_id)

    if existing_chapters:
        output = _completed_output(existing_chapters)
        _mark_completed(job_id, output)
        return _result_message(
            message,
            queued_job,
            job_input,
            status=JobStatus.COMPLETED,
            skipped=True,
        )

    _mark_processing_started(job_id)

    output = run_generate_chapters_pipeline(
        queued_job,
        transcript_id=str(job_input.transcript_id),
        transcript_version=job_input.transcript_version,
        options=options,
    )

    _mark_completed(job_id, output)

    return _result_message(
        message,
        queued_job,
        job_input,
        status=JobStatus.COMPLETED,
        skipped=False,
    )


def _mark_processing_started(job_id: str) -> None:
    """Mark a generate chapters job as running with coarse MVP progress."""
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.GENERATING_CHAPTERS,
            progress=50,
            current_step="Generating chapters",
        )


def _mark_completed(job_id: str, output: GenerateChaptersJobOutput) -> None:
    """Persist the completed chapter generation output payload for a job."""
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def record_generate_chapters_job_failure(
    job_id: str,
    error_message: str,
    *,
    error_code: str | None = None,
) -> None:
    """Record a terminal generate chapters job failure for consumer error paths."""
    with get_db_session() as session:
        jobs_repository.mark_job_failed(
            session,
            job_id,
            error_message,
            error_code=error_code,
        )


def increment_generate_chapters_job_attempt(job_id: str) -> int | None:
    """Increment a generate chapters job retry counter and return the latest count."""
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    if not job:
        return None

    return job.attempt_count


def _guard_job(
    message: GenerateChaptersJobMessage, job: ProcessingJobRow | None
) -> ProcessingJobRow:
    """Reject jobs that are missing, mismatched, failed, or the wrong type."""
    if not job:
        raise TerminalGenerateChaptersJobError(
            "Processing job was not found",
            error_code="GENERATE_CHAPTERS_JOB_NOT_FOUND",
        )

    if job.job_type != message.job_type:
        raise TerminalGenerateChaptersJobError(
            f"Expected {message.job_type.value} job, got {job.job_type.value}",
            error_code="GENERATE_CHAPTERS_JOB_TYPE_MISMATCH",
        )

    if job.task_name != message.task_name:
        raise TerminalGenerateChaptersJobError(
            "Message taskName does not match processing job",
            error_code="GENERATE_CHAPTERS_TASK_NAME_MISMATCH",
        )

    if job.status in {JobStatus.FAILED, JobStatus.COMPLETED, JobStatus.CANCELED}:
        raise TerminalGenerateChaptersJobError(
            "Processing job is already terminal",
            error_code="GENERATE_CHAPTERS_JOB_ALREADY_TERMINAL",
        )

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    """Reject a job when the worker retry budget is already exhausted."""
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalGenerateChaptersJobError(
            "Processing job exceeded max attempts",
            error_code="GENERATE_CHAPTERS_MAX_ATTEMPTS_EXCEEDED",
        )


def _should_skip_job(job: ProcessingJobRow) -> bool:
    """Return whether a job should be skipped because it is not pending."""
    return job.status != JobStatus.PENDING


def _find_existing_chapters(
    job_id: str,
) -> chapters_repository.PersistedChaptersSummary | None:
    """Return an existing chapters for idempotent generate chapters job handling."""
    with get_db_session() as session:
        return chapters_repository.find_chapters_by_job_id(session, job_id)


def _parse_job_input(job: ProcessingJobRow) -> GenerateChaptersJobInput:
    """Parse immutable chapter generation input from the processing job row."""
    try:
        return GenerateChaptersJobInput.model_validate(job.input or {})
    except ValidationError as error:
        raise TerminalGenerateChaptersJobError(
            "Processing job input is invalid",
            error_code="GENERATE_CHAPTERS_JOB_INPUT_INVALID",
        ) from error


def _completed_output(
    chapter_summary: chapters_repository.PersistedChaptersSummary,
) -> GenerateChaptersJobOutput:
    """Build completed output for an already persisted chapters."""
    return GenerateChaptersJobOutput(
        transcript_id=chapter_summary.transcript_id,
        transcript_version=chapter_summary.transcript_version,
        chapter_count=len(chapter_summary.chapters),
    )


def _result_message(
    message: GenerateChaptersJobMessage,
    job: ProcessingJobRow,
    job_input: GenerateChaptersJobInput,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    """Build the queue result message with API-compatible JSON aliases."""
    result = GenerateChaptersJobResultMessage(
        jobId=message.job_id,
        mediaId=job.media_id,
        userId=job.user_id,
        transcriptId=job_input.transcript_id,
        transcriptVersion=job_input.transcript_version,
        status=status,
        skipped=skipped,
    )

    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(
    message: GenerateChaptersJobMessage,
    job: ProcessingJobRow,
    job_input: GenerateChaptersJobInput,
    status: JobStatus,
) -> dict[str, Any]:
    """Build a skipped chapter generation result for already claimed or completed jobs."""
    return _result_message(message, job, job_input, status=status, skipped=True)
