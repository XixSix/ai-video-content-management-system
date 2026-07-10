import logging
from typing import Any

from pydantic import ValidationError

from app.core.config import settings
from app.db import jobs_repository, transcript_repository
from app.db.client import get_db_session
from app.errors import TerminalJobError
from app.pipelines.transcribe.pipeline import run_transcribe_pipeline
from app.schemas.db.processsing_job import JobStatus, ProcessingJobRow
from app.schemas.jobs.transcribe_message import (
    TranscribeJobMessage,
    TranscribeJobResultMessage,
)
from app.schemas.transcribe.input import TranscribeJobInput
from app.schemas.transcribe.output import TranscribeJobOutput

logger = logging.getLogger(__name__)


class TerminalTranscribeJobError(TerminalJobError):
    pass


def process_transcribe_job(message: TranscribeJobMessage) -> dict[str, Any]:
    """Claim and validate a transcribe job before delegating pipeline work."""
    job_id = str(message.job_id)

    logger.info("Processing transcribe job job_id=%s", job_id)

    with get_db_session() as session:
        job = _guard_job(message, jobs_repository.find_processing_job(session, job_id))
        _guard_retry_budget(job)

    if _should_skip_job(job):
        return _skipped_result(message, job, job.status)

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(
            session, job_id, current_step="Queued for transcribe processing"
        )

    if not queued_job:
        # Another worker may have claimed the job between validation and update.
        with get_db_session() as session:
            current_job = _guard_job(
                message, jobs_repository.find_processing_job(session, job_id)
            )

        if current_job.status in {
            JobStatus.TRANSCRIBING,
            JobStatus.QUEUED,
            JobStatus.COMPLETED,
            JobStatus.CANCELED,
        }:
            return _skipped_result(message, current_job, current_job.status)

        raise TerminalTranscribeJobError(
            "Processing job could not be marked queued",
            error_code="TRANSCRIBE_JOB_CLAIM_FAILED",
        )

    job_input = _parse_job_input(queued_job)
    options = job_input.options
    existing_transcript = _find_existing_transcript(job_id)

    if existing_transcript:
        output = _completed_output(existing_transcript)
        _mark_completed(job_id, output)
        return _result_message(
            message,
            queued_job,
            status=JobStatus.COMPLETED,
            skipped=True,
        )

    _mark_processing_started(job_id)

    output = run_transcribe_pipeline(queued_job, options=options)

    _mark_completed(job_id, output)

    return _result_message(
        message,
        queued_job,
        status=JobStatus.COMPLETED,
        skipped=False,
    )


def _mark_processing_started(job_id: str) -> None:
    """Mark a transcribe job as running with coarse MVP progress."""
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.TRANSCRIBING,
            progress=50,
            current_step="Transcribing media",
        )


def _mark_completed(job_id: str, output: TranscribeJobOutput) -> None:
    """Persist the completed transcript output payload for a job."""
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def record_transcribe_job_failure(
    job_id: str,
    error_message: str,
    *,
    error_code: str | None = None,
) -> None:
    """Record a terminal transcribe job failure for consumer error paths."""
    with get_db_session() as session:
        jobs_repository.mark_job_failed(
            session,
            job_id,
            error_message,
            error_code=error_code,
        )


def increment_transcribe_job_attempt(job_id: str) -> int | None:
    """Increment a transcribe job retry counter and return the latest count."""
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    if not job:
        return None

    return job.attempt_count


def _guard_job(
    message: TranscribeJobMessage, job: ProcessingJobRow | None
) -> ProcessingJobRow:
    """Reject jobs that are missing, mismatched, failed, or the wrong type."""
    if not job:
        raise TerminalTranscribeJobError(
            "Processing job was not found",
            error_code="TRANSCRIBE_JOB_NOT_FOUND",
        )

    if job.job_type != message.job_type:
        raise TerminalTranscribeJobError(
            f"Expected {message.job_type.value} job, got {job.job_type.value}",
            error_code="TRANSCRIBE_JOB_TYPE_MISMATCH",
        )

    if job.task_name != message.task_name:
        raise TerminalTranscribeJobError(
            "Message taskName does not match processing job",
            error_code="TRANSCRIBE_TASK_NAME_MISMATCH",
        )

    # Already proceed or cancel
    if job.status in {JobStatus.FAILED, JobStatus.COMPLETED, JobStatus.CANCELED}:
        raise TerminalTranscribeJobError(
            "Processing job is already terminal",
            error_code="TRANSCRIBE_JOB_ALREADY_TERMINAL",
        )

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    """Reject a job when the worker retry budget is already exhausted."""
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalTranscribeJobError(
            "Processing job exceeded max attempts",
            error_code="TRANSCRIBE_MAX_ATTEMPTS_EXCEEDED",
        )


def _should_skip_job(job: ProcessingJobRow) -> bool:
    """Return whether a job should be skipped because it is not pending."""
    return job.status != JobStatus.PENDING


def _find_existing_transcript(
    job_id: str,
) -> transcript_repository.PersistedTranscriptSummary | None:
    """Return an existing transcript for idempotent transcribe job handling."""
    with get_db_session() as session:
        return transcript_repository.find_transcript_by_job_id(session, job_id)


def _parse_job_input(job: ProcessingJobRow) -> TranscribeJobInput:
    """Parse immutable transcribe input from the processing job row."""
    try:
        return TranscribeJobInput.model_validate(job.input or {})
    except ValidationError as error:
        raise TerminalTranscribeJobError(
            "Processing job input is invalid",
            error_code="TRANSCRIBE_JOB_INPUT_INVALID",
        ) from error


def _completed_output(
    transcript: transcript_repository.PersistedTranscriptSummary,
) -> TranscribeJobOutput:
    """Build completed output for an already persisted transcript."""
    return TranscribeJobOutput(
        transcript_id=transcript.id,
        segment_count=transcript.segment_count,
        word_count=transcript.word_count,
    )


def _result_message(
    message: TranscribeJobMessage,
    job: ProcessingJobRow,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    """Build the queue result message with API-compatible JSON aliases."""
    result = TranscribeJobResultMessage(
        jobId=message.job_id,
        mediaId=job.media_id,
        userId=job.user_id,
        status=status,
        skipped=skipped,
    )

    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(
    message: TranscribeJobMessage,
    job: ProcessingJobRow,
    status: JobStatus,
) -> dict[str, Any]:
    """Build a skipped transcribe result for already claimed or completed jobs."""
    return _result_message(message, job, status=status, skipped=True)
