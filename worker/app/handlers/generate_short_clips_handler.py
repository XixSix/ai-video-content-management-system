import logging
from typing import Any

from pydantic import ValidationError

from app.core.config import settings
from app.db import jobs_repository, short_clip_repository
from app.db.client import get_db_session
from app.errors import TerminalJobError
from app.pipelines.generate_short_clips.pipeline import (
    run_generate_short_clips_pipeline,
)
from app.schemas.db.processsing_job import JobStatus, ProcessingJobRow
from app.schemas.jobs.generate_short_clips_message import (
    GenerateShortClipsJobMessage,
    GenerateShortClipsJobResultMessage,
)
from app.schemas.short_clip.input import GenerateShortClipsJobInput
from app.schemas.short_clip.output import GenerateShortClipsJobOutput

logger = logging.getLogger(__name__)


class TerminalGenerateShortClipsJobError(TerminalJobError):
    pass


def process_generate_short_clips_job(
    message: GenerateShortClipsJobMessage,
) -> dict[str, Any]:
    job_id = str(message.job_id)
    logger.info("Processing generate short clips job job_id=%s", job_id)

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
            JobStatus.CANCELED,
        }:
            job_input = _parse_job_input(current_job)
            return _skipped_result(message, current_job, job_input, current_job.status)

        raise TerminalGenerateShortClipsJobError(
            "Processing job could not be marked queued",
            error_code="GENERATE_SHORT_CLIPS_JOB_CLAIM_FAILED",
        )

    job_input = _parse_job_input(queued_job)
    options = job_input.options
    existing_short_clips = _find_existing_short_clips(job_id)

    if existing_short_clips:
        output = _completed_output(
            existing_short_clips,
            job_input=job_input,
        )
        _mark_completed(job_id, output)
        return _result_message(
            message,
            queued_job,
            job_input,
            status=JobStatus.COMPLETED,
            skipped=True,
        )

    _mark_processing_started(job_id)

    output = run_generate_short_clips_pipeline(
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


def record_generate_short_clips_job_failure(
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
        short_clip_repository.mark_short_clips_failed_by_job_id(session, job_id)


def increment_generate_short_clips_job_attempt(job_id: str) -> int | None:
    with get_db_session() as session:
        jobs_repository.increment_attempt_count(session, job_id)
        job = jobs_repository.find_processing_job(session, job_id)

    return job.attempt_count if job else None


def _guard_job(
    message: GenerateShortClipsJobMessage, job: ProcessingJobRow | None
) -> ProcessingJobRow:
    if not job:
        raise TerminalGenerateShortClipsJobError(
            "Processing job was not found",
            error_code="GENERATE_SHORT_CLIPS_JOB_NOT_FOUND",
        )

    if job.job_type != message.job_type:
        raise TerminalGenerateShortClipsJobError(
            f"Expected {message.job_type.value} job, got {job.job_type.value}",
            error_code="GENERATE_SHORT_CLIPS_JOB_TYPE_MISMATCH",
        )

    if job.task_name != message.task_name:
        raise TerminalGenerateShortClipsJobError(
            "Message taskName does not match processing job",
            error_code="GENERATE_SHORT_CLIPS_TASK_NAME_MISMATCH",
        )

    if job.status in {JobStatus.FAILED, JobStatus.COMPLETED, JobStatus.CANCELED}:
        raise TerminalGenerateShortClipsJobError(
            "Processing job is already terminal",
            error_code="GENERATE_SHORT_CLIPS_JOB_ALREADY_TERMINAL",
        )

    return job


def _guard_retry_budget(job: ProcessingJobRow) -> None:
    if job.attempt_count >= settings.task_max_retries:
        raise TerminalGenerateShortClipsJobError(
            "Processing job exceeded max attempts",
            error_code="GENERATE_SHORT_CLIPS_MAX_ATTEMPTS_EXCEEDED",
        )


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


def _mark_completed(job_id: str, output: GenerateShortClipsJobOutput) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
        )


def _find_existing_short_clips(
    job_id: str,
) -> short_clip_repository.PersistedShortClipsSummary | None:
    with get_db_session() as session:
        return short_clip_repository.find_output_by_job_id(session, job_id)


def _parse_job_input(job: ProcessingJobRow) -> GenerateShortClipsJobInput:
    try:
        return GenerateShortClipsJobInput.model_validate(job.input or {})
    except ValidationError as error:
        raise TerminalGenerateShortClipsJobError(
            "Processing job input is invalid",
            error_code="GENERATE_SHORT_CLIPS_JOB_INPUT_INVALID",
        ) from error


def _completed_output(
    short_clip_summary: short_clip_repository.PersistedShortClipsSummary,
    *,
    job_input: GenerateShortClipsJobInput,
) -> GenerateShortClipsJobOutput:
    candidate_ids = [candidate.id for candidate in short_clip_summary.candidates]
    short_clip_ids = [short_clip.id for short_clip in short_clip_summary.short_clips]
    asset_ids = [asset.id for asset in short_clip_summary.assets]

    return GenerateShortClipsJobOutput(
        transcript_id=job_input.transcript_id,
        transcript_version=job_input.transcript_version,
        candidate_count=len(candidate_ids),
        short_clip_count=len(short_clip_ids),
        asset_count=len(asset_ids),
        candidate_ids=candidate_ids,
        short_clip_ids=short_clip_ids,
        asset_ids=asset_ids,
    )


def _result_message(
    message: GenerateShortClipsJobMessage,
    job: ProcessingJobRow,
    job_input: GenerateShortClipsJobInput,
    *,
    status: JobStatus,
    skipped: bool,
) -> dict[str, Any]:
    result = GenerateShortClipsJobResultMessage(
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
    message: GenerateShortClipsJobMessage,
    job: ProcessingJobRow,
    job_input: GenerateShortClipsJobInput,
    status: JobStatus,
) -> dict[str, Any]:
    return _result_message(message, job, job_input, status=status, skipped=True)
