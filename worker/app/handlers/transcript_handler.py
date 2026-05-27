import shutil
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.db import jobs_repository, transcript_repository
from app.db.client import get_db_session
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
from app.services.ffmpeg_service import (
    AudioSanityError,
    AudioSanityResult,
    ffmpeg_service,
)
from app.services.placeholder_transcription_service import (
    placeholder_transcription_service,
)
from app.services.s3_service import S3SourceObjectNotFoundError, s3_service


class TerminalTranscriptJobError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


IN_PROGRESS_JOB_STATUSES = {
    JobStatus.EXTRACTING_AUDIO,
    JobStatus.TRANSCRIBING,
}


def process_transcript_job(message: TranscriptJobMessage) -> dict[str, Any]:
    """ """
    job_id = str(message.job_id)

    with get_db_session() as session:
        job = jobs_repository.find_processing_job(session, job_id)
        _guard_job(message, job)

    if job.status == JobStatus.FAILED:
        raise TerminalTranscriptJobError("Processing job is already failed")

    if job.attempt_count >= settings.task_max_retries:
        raise TerminalTranscriptJobError("Processing job exceeded max attempts")

    if job.status != JobStatus.PENDING:
        return _skipped_result(message, job.status)

    with get_db_session() as session:
        queued_job = jobs_repository.mark_job_queued_from_pending(session, job_id)

    if not queued_job:
        with get_db_session() as session:
            current_job = jobs_repository.find_processing_job(session, job_id)
            _guard_job(message, current_job)

        if current_job and current_job.status in IN_PROGRESS_JOB_STATUSES | {
            JobStatus.QUEUED,
            JobStatus.COMPLETED,
        }:
            return _skipped_result(message, current_job.status)

        raise TerminalTranscriptJobError("Processing job could not be marked queued")

    options = TranscriptJobOptions.model_validate(queued_job.input or {})
    workspace = _workspace_for_job(job_id)

    try:
        existing_transcript = _find_existing_transcript(job_id)

        if existing_transcript:
            output = _completed_output(existing_transcript, options=options, audio=None)
            _mark_completed(job_id, output)
            return _result_message(message, status=JobStatus.COMPLETED, skipped=True)

        _mark_job_step(
            job_id,
            status=JobStatus.EXTRACTING_AUDIO,
            progress=10,
            current_step="Downloading source media",
        )
        source_path = _download_source(message.s3_key, workspace)

        _mark_job_step(
            job_id,
            status=JobStatus.EXTRACTING_AUDIO,
            progress=30,
            current_step="Extracting audio",
        )
        audio_path = workspace / "audio.wav"
        ffmpeg_service.extract_audio(source_path, audio_path)
        audio = ffmpeg_service.validate_audio(audio_path)

        _mark_job_step(
            job_id,
            status=JobStatus.TRANSCRIBING,
            progress=60,
            current_step="Generating placeholder transcript",
        )
        transcript_result = placeholder_transcription_service.transcribe(
            audio=audio, options=options
        )

        _mark_job_step(
            job_id,
            status=JobStatus.PREPROCESSING_TRANSCRIPT,
            progress=80,
            current_step="Saving transcript",
        )
        with get_db_session() as session:
            transcript = transcript_repository.save_transcript(
                session,
                job_id=job_id,
                media_id=str(message.media_id),
                result=transcript_result,
            )

        output = _completed_output(transcript, options=options, audio=audio)
        _mark_completed(job_id, output)

        return _result_message(message, status=JobStatus.COMPLETED, skipped=False)
    except S3SourceObjectNotFoundError as error:
        raise TerminalTranscriptJobError(
            str(error), error_code=error.error_code
        ) from error
    except AudioSanityError as error:
        raise TerminalTranscriptJobError(
            str(error), error_code=error.error_code
        ) from error
    finally:
        _cleanup_workspace(workspace)


def _mark_job_step(
    job_id: str, *, status: JobStatus, progress: int, current_step: str
) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_step(
            session,
            job_id,
            status=status,
            progress=progress,
            current_step=current_step,
        )


def _mark_completed(job_id: str, output: TranscriptCompletedOutput) -> None:
    with get_db_session() as session:
        jobs_repository.mark_job_completed(
            session,
            job_id,
            output=output.model_dump(mode="json", by_alias=True),
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


def _workspace_for_job(job_id: str) -> Path:
    return settings.tmp_dir / "transcripts" / job_id


def _download_source(s3_key: str, workspace: Path) -> Path:
    suffix = Path(s3_key).suffix or ".source"
    source_path = workspace / f"source{suffix}"

    return s3_service.download_file(s3_key, source_path)


def _cleanup_workspace(workspace: Path) -> None:
    shutil.rmtree(workspace, ignore_errors=True)


def _find_existing_transcript(
    job_id: str,
) -> transcript_repository.PersistedTranscriptSummary | None:
    with get_db_session() as session:
        return transcript_repository.find_transcript_by_job_id(session, job_id)


def _completed_output(
    transcript: transcript_repository.PersistedTranscriptSummary,
    *,
    options: TranscriptJobOptions,
    audio: AudioSanityResult | None,
) -> TranscriptCompletedOutput:
    return TranscriptCompletedOutput(
        transcript=TranscriptOutputSummary(
            id=transcript.id,
            language=transcript.language,
            segment_count=transcript.segment_count,
            word_count=transcript.word_count,
            full_text_preview=transcript.full_text_preview,
        ),
        audio=TranscriptAudioOutput(
            duration_seconds=audio.metadata.duration_seconds if audio else None,
            sample_rate=audio.metadata.sample_rate if audio else None,
            channels=audio.metadata.channels if audio else None,
            codec_name=audio.metadata.codec_name if audio else None,
            silence_ratio=audio.silence_ratio if audio else None,
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
    result = TranscriptJobResultMessage(
        job_id=message.job_id,
        media_id=message.media_id,
        user_id=message.user_id,
        status=status,
        skipped=skipped,
    )

    return result.model_dump(mode="json", by_alias=True)


def _skipped_result(message: TranscriptJobMessage, status: JobStatus) -> dict[str, Any]:
    return _result_message(message, status=status, skipped=True)
