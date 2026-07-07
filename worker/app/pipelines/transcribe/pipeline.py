import logging
from pathlib import Path

from app.core.config import settings
from app.db import transcript_repository
from app.db.client import get_db_session
from app.schemas.db.processsing_job import ProcessingJobRow
from app.schemas.transcribe.input import TranscribeOptions
from app.schemas.transcribe.output import TranscribeJobOutput
from app.services.ffmpeg_service import (
    AudioSanityError,
    ffmpeg_service,
)
from app.services.ai_service import AIServiceTerminalError, ai_service_client
from app.services.s3_service import S3SourceObjectNotFoundError, s3_service

logger = logging.getLogger(__name__)


class TerminalTranscribePipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def run_transcribe_pipeline(
    job: ProcessingJobRow,
    *,
    options: TranscribeOptions,
) -> TranscribeJobOutput:
    """Run transcribe media processing and return the completed transcript payload."""
    job_id = str(job.id)
    workspace = _workspace_for_job(job_id)
    logger.info(
        "Starting transcribe pipeline job_id=%s workspace=%s", job_id, workspace
    )

    try:
        with get_db_session() as session:
            source = transcript_repository.load_transcribe_media_source(
                session,
                str(job.media_id),
            )

        if source is None:
            raise TerminalTranscribePipelineError(
                "Source media was not found",
                error_code="TRANSCRIBE_MEDIA_NOT_FOUND",
            )

        if str(source.user_id) != str(job.user_id):
            raise TerminalTranscribePipelineError(
                "Source media user does not match processing job",
                error_code="TRANSCRIBE_MEDIA_USER_MISMATCH",
            )

        if source.status != "UPLOADED":
            raise TerminalTranscribePipelineError(
                "Source media is not uploaded",
                error_code="TRANSCRIBE_MEDIA_NOT_UPLOADED",
            )

        if source.media_type not in {"VIDEO", "AUDIO"}:
            raise TerminalTranscribePipelineError(
                "Source media type is not transcribable",
                error_code="TRANSCRIBE_MEDIA_TYPE_UNSUPPORTED",
            )

        source_path = _download_source(
            source.s3_key,
            workspace,
            bucket=source.s3_bucket,
        )
        audio_path = workspace / "audio.wav"
        ffmpeg_service.extract_audio(source_path, audio_path)
        ffmpeg_service.validate_audio(audio_path)

        result = ai_service_client.transcribe(
            request_id=job_id,
            audio_path=audio_path,
            options=options,
        )

        with get_db_session() as session:
            transcript = transcript_repository.save_transcript(
                session,
                job_id=job_id,
                media_id=str(job.media_id),
                result=result,
            )

        return _completed_output(transcript)
    except S3SourceObjectNotFoundError as error:
        logger.warning("Source media not found job_id=%s error=%s", job_id, error)
        raise TerminalTranscribePipelineError(
            str(error),
            error_code=error.error_code,
        ) from error
    except AudioSanityError as error:
        logger.warning("Audio sanity check failed job_id=%s error=%s", job_id, error)
        raise TerminalTranscribePipelineError(
            str(error),
            error_code=error.error_code,
        ) from error
    except AIServiceTerminalError as error:
        logger.warning(
            "AI service rejected transcribe job_id=%s error=%s", job_id, error
        )
        raise TerminalTranscribePipelineError(
            str(error),
            error_code=error.error_code,
        ) from error


def _workspace_for_job(job_id: str) -> Path:
    """Return the local storage workspace path for a transcribe job."""
    return settings.storage_dir / "transcripts" / job_id


def _download_source(s3_key: str, workspace: Path, *, bucket: str) -> Path:
    """Download source media into the job workspace with its original suffix."""
    suffix = Path(s3_key).suffix or ".source"
    source_path = workspace / f"source{suffix}"

    return s3_service.download_file(s3_key, source_path, bucket=bucket)


def _completed_output(
    transcript: transcript_repository.PersistedTranscriptSummary,
) -> TranscribeJobOutput:
    """Build the persisted processing job output from the saved transcript."""
    return TranscribeJobOutput(
        transcript_id=transcript.id,
        segment_count=transcript.segment_count,
        word_count=transcript.word_count,
    )
