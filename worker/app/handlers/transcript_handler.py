import logging
from typing import Any

from app.core.config import settings
from app.db import jobs_repository, transcript_repository
from app.db.client import get_db_session
from app.pipelines.transcript.pipeline import run_transcript_pipeline
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.transcript_message import (
    TranscriptJobMessage,
    TranscriptJobResultMessage,
)
from app.schemas.transcript.output import (
    TranscriptArtifactsOutput,
    TranscriptAudioOutput,
    TranscriptCompletedOutput,
    TranscriptJobOptions,
    TranscriptOutputSummary,
)

logger = logging.getLogger(__name__)


class TerminalTranscriptJobError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def process_transcript_job(message: TranscriptJobMessage) -> dict[str, Any]:
    """Claim and validate a transcript job before delegating pipeline work."""
    job_id = str(message.job_id)

    logger.info(
        "Processing transcript job job_id=%s media_id=%s", job_id, message.media_id
    )

    with get_db_session() as session:
        job = _guard_job(message, jobs_repository.find_processing_job(session, job_id))
        _guard_retry_budget(job)

    if _should_skip_job(job):
        return _skipped_result(message, job.status)

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(
            session, job_id, current_step="Queued for transcript generation"
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
        }:
            return _skipped_result(message, current_job.status)

        raise TerminalTranscriptJobError("Processing job could not be marked queued")

    options = TranscriptJobOptions.model_validate(queued_job.input or {})
    existing_transcript = _find_existing_transcript(job_id)

    if existing_transcript:
        output = _completed_output(
            existing_transcript,
            options=options,
        )
        _mark_completed(job_id, output)
        return _result_message(message, status=JobStatus.COMPLETED, skipped=True)

    _mark_processing_started(job_id)

    output = run_transcript_pipeline(message, options=options)

    _mark_completed(job_id, output)

    return _result_message(
        message,
        status=JobStatus.COMPLETED,
        skipped=False,
    )


def _mark_processing_started(job_id: str) -> None:
    """Mark a transcript job as running with coarse MVP progress."""
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=JobStatus.TRANSCRIBING,
            progress=50,
            current_step="Processing transcript",
        )


def _mark_completed(job_id: str, output: TranscriptCompletedOutput) -> None:
    """Persist the completed transcript output payload for a job."""
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def record_transcript_job_failure(job_id: str, error_message: str) -> None:
    """Record a terminal transcript job failure for consumer error paths."""
    with get_db_session() as session:
        jobs_repository.mark_job_failed(session, job_id, error_message)


def increment_transcript_job_attempt(job_id: str) -> int | None:
    """Increment a transcript job retry counter and return the latest count."""
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    if not job:
        return None

    return job.attempt_count


def _guard_job(
    message: TranscriptJobMessage, job: ProcessingJobRow | None
) -> ProcessingJobRow:
    """Reject jobs that are missing, mismatched, failed, or the wrong type."""
    if not job:
        raise TerminalTranscriptJobError("Processing job was not found")

    if job.job_type != JobType.TRANSCRIBE:
        raise TerminalTranscriptJobError(
            f"Expected TRANSCRIBE job, got {job.job_type.value}"
        )

    if str(job.media_id) != str(message.media_id):
        raise TerminalTranscriptJobError(
            "Message mediaId does not match processing job"
        )

    if str(job.user_id) != str(message.user_id):
        raise TerminalTranscriptJobError("Message userId does not match processing job")

    if job.status == JobStatus.FAILED:
        raise TerminalTranscriptJobError("Processing job is already failed")

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    """Reject a job when the worker retry budget is already exhausted."""
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalTranscriptJobError("Processing job exceeded max attempts")


def _should_skip_job(job: ProcessingJobRow) -> bool:
    """Return whether a job should be skipped because it is not pending."""
    return job.status != JobStatus.PENDING


def _find_existing_transcript(
    job_id: str,
) -> transcript_repository.PersistedTranscriptSummary | None:
    """Return an existing transcript for idempotent transcript job handling."""
    with get_db_session() as session:
        return transcript_repository.find_transcript_by_job_id(session, job_id)


def _completed_output(
    transcript: transcript_repository.PersistedTranscriptSummary,
    *,
    options: TranscriptJobOptions,
) -> TranscriptCompletedOutput:
    """Build completed output for an already persisted transcript."""
    return TranscriptCompletedOutput(
        transcript=TranscriptOutputSummary(
            id=transcript.id,
            language=transcript.language,
            model=transcript.model,
            segment_count=transcript.segment_count,
            word_count=transcript.word_count,
            full_text_preview=transcript.full_text_preview,
        ),
        audio=TranscriptAudioOutput(
            duration_seconds=None,
            sample_rate=None,
            channels=None,
            codec_name=None,
            silence_ratio=None,
        ),
        artifacts=TranscriptArtifactsOutput(),
        options=options,
    )


def _result_message(
    message: TranscriptJobMessage,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    """Build the queue result message with API-compatible JSON aliases."""
    result = TranscriptJobResultMessage(
        job_id=message.job_id,
        media_id=message.media_id,
        user_id=message.user_id,
        status=status,
        skipped=skipped,
    )

    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(message: TranscriptJobMessage, status: JobStatus) -> dict[str, Any]:
    """Build a skipped transcript result for already claimed or completed jobs."""
    return _result_message(message, status=status, skipped=True)
