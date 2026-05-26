from typing import Any

from app.core.config import settings
from app.db import jobs_repository
from app.db.client import get_db_session
from app.schemas.jobs import JobStatus, JobType, ProcessingJobRow
from app.schemas.transcripts import TranscriptJobMessage


class TerminalTranscriptJobError(Exception):
    pass

IN_PROGRESS_JOB_STATUSES = {
    JobStatus.EXTRACTING_AUDIO,
    JobStatus.TRANSCRIBING,
    JobStatus.PREPROCESSING_TRANSCRIPT,
}


def process_transcript_job(message: TranscriptJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)

    with get_db_session() as session:
        job = jobs_repository.find_processing_job(session, job_id)
        _guard_job(message, job)

    if job.status == JobStatus.FAILED:
        raise TerminalTranscriptJobError("Processing job is already failed")

    if job.attempt_count >= settings.task_max_retries:
        raise TerminalTranscriptJobError("Processing job exceeded max attempts")

    if job.status != JobStatus.PENDING:
        return {"jobId": job_id, "status": job.status.value, "skipped": True}

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(session, job_id)

    if not queued_job:
        with get_db_session() as session:
            current_job = jobs_repository.find_processing_job(session, job_id)
            _guard_job(message, current_job)

        if current_job and current_job.status in IN_PROGRESS_JOB_STATUSES | {JobStatus.QUEUED, JobStatus.COMPLETED}:
            return {"jobId": job_id, "status": current_job.status.value, "skipped": True}

        raise TerminalTranscriptJobError("Processing job could not be marked queued")

    _mark_job_step(
        job_id,
        status=JobStatus.EXTRACTING_AUDIO,
        progress=10,
        current_step="Extracting audio",
    )

    _mark_job_step(
        job_id,
        status=JobStatus.TRANSCRIBING,
        progress=50,
        current_step="Transcribing audio",
    )
    _mark_job_step(
        job_id,
        status=JobStatus.PREPROCESSING_TRANSCRIPT,
        progress=80,
        current_step="Preparing transcript",
    )
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output={
                "transcriptId": None,
                "segmentCount": 0,
                "mock": True,
                "s3Key": message.s3_key,
            },
        )

    return {"jobId": job_id, "status": "COMPLETED", "mock": True}


def _mark_job_step(job_id: str, *, status: JobStatus, progress: int, current_step: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=status,
            progress=progress,
            current_step=current_step,
        )


def record_transcript_job_failure(job_id: str, error_message: str) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_failed(session, job_id, error_message)


def increment_transcript_job_attempt(job_id: str) -> int | None:
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    if not job:
        return None

    return job.attempt_count


def _guard_job(message: TranscriptJobMessage, job: ProcessingJobRow | None) -> None:
    if not job:
        raise TerminalTranscriptJobError("Processing job was not found")

    if job.job_type != JobType.TRANSCRIBE:
        raise TerminalTranscriptJobError(f"Expected TRANSCRIBE job, got {job.job_type.value}")

    if str(job.media_id) != str(message.media_id):
        raise TerminalTranscriptJobError("Message mediaId does not match processing job")

    if str(job.user_id) != str(message.user_id):
        raise TerminalTranscriptJobError("Message userId does not match processing job")

    if job.status == JobStatus.FAILED:
        raise TerminalTranscriptJobError("Processing job is already failed")
