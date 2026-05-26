from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, constr

from app.core.config import settings
from app.db import jobs_repository
from app.db.client import get_db_session


class TranscriptJobMessage(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    job_id: UUID = Field(alias="jobId")
    media_id: UUID = Field(alias="mediaId")
    user_id: UUID = Field(alias="userId")
    s3_key: constr(strip_whitespace=True, min_length=1) = Field(alias="s3Key")
    task_name: Literal["transcribe"] = Field(alias="taskName")


class TerminalTranscriptJobError(Exception):
    pass


def process_transcript_job(message: TranscriptJobMessage) -> dict[str, Any]:
    job_id = str(message.job_id)

    with get_db_session() as session:
        job = jobs_repository.find_processing_job(session, job_id)
        _guard_job(message, job)

    if job["status"] == "COMPLETED":
        return {"jobId": job_id, "status": "COMPLETED", "skipped": True}

    _mark_job_step(
        job_id,
        status="EXTRACTING_AUDIO",
        progress=10,
        current_step="Extracting audio",
    )
    _mark_job_step(
        job_id,
        status="TRANSCRIBING",
        progress=50,
        current_step="Transcribing audio",
    )
    _mark_job_step(
        job_id,
        status="PREPROCESSING_TRANSCRIPT",
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


def _mark_job_step(job_id: str, *, status: str, progress: int, current_step: str) -> None:
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

    return int(job["attemptCount"])


def _guard_job(message: TranscriptJobMessage, job: dict[str, Any] | None) -> None:
    if not job:
        raise TerminalTranscriptJobError("Processing job was not found")

    if job["jobType"] != "TRANSCRIBE":
        raise TerminalTranscriptJobError(f"Expected TRANSCRIBE job, got {job['jobType']}")

    if str(job["mediaId"]) != str(message.media_id):
        raise TerminalTranscriptJobError("Message mediaId does not match processing job")

    if str(job["userId"]) != str(message.user_id):
        raise TerminalTranscriptJobError("Message userId does not match processing job")

    if job["status"] == "FAILED":
        raise TerminalTranscriptJobError("Processing job is already failed")

    if job["status"] == "COMPLETED":
        return

    if int(job["attemptCount"]) >= settings.task_max_retries:
        raise TerminalTranscriptJobError("Processing job exceeded max attempts")
