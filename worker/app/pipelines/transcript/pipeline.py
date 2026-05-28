from pathlib import Path

from app.core.config import settings
from app.db import transcript_repository
from app.db.client import get_db_session
from app.schemas.jobs.transcript_message import TranscriptJobMessage
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
from app.services.ai_service import AIServiceTerminalError, ai_service_client
from app.services.s3_service import S3SourceObjectNotFoundError, s3_service


class TerminalTranscriptPipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def run_transcript_pipeline(
    message: TranscriptJobMessage,
    *,
    options: TranscriptJobOptions,
) -> TranscriptCompletedOutput:
    """Run transcript media processing and return the completed output payload."""
    job_id = str(message.job_id)
    workspace = _workspace_for_job(job_id)

    try:
        source_path = _download_source(message.s3_key, workspace)
        audio_path = workspace / "audio.wav"
        ffmpeg_service.extract_audio(source_path, audio_path)
        audio = ffmpeg_service.validate_audio(audio_path)

        transcript_result = ai_service_client.transcribe(
            request_id=job_id,
            audio_path=audio_path,
            options=options,
        )

        with get_db_session() as session:
            transcript = transcript_repository.save_transcript(
                session,
                job_id=job_id,
                media_id=str(message.media_id),
                result=transcript_result,
            )

        return _completed_output(transcript, options=options, audio=audio)
    except S3SourceObjectNotFoundError as error:
        raise TerminalTranscriptPipelineError(
            str(error),
            error_code=error.error_code,
        ) from error
    except AudioSanityError as error:
        raise TerminalTranscriptPipelineError(
            str(error),
            error_code=error.error_code,
        ) from error
    except AIServiceTerminalError as error:
        raise TerminalTranscriptPipelineError(
            str(error),
            error_code=error.error_code,
        ) from error


def _workspace_for_job(job_id: str) -> Path:
    """Return the local storage workspace path for a transcript job."""
    return settings.storage_dir / "transcripts" / job_id


def _download_source(s3_key: str, workspace: Path) -> Path:
    """Download source media into the job workspace with its original suffix."""
    suffix = Path(s3_key).suffix or ".source"
    source_path = workspace / f"source{suffix}"

    return s3_service.download_file(s3_key, source_path)


def _completed_output(
    transcript: transcript_repository.PersistedTranscriptSummary,
    *,
    options: TranscriptJobOptions,
    audio: AudioSanityResult | None,
) -> TranscriptCompletedOutput:
    """Build the completed job output from transcript, audio, and options data."""
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
            duration_seconds=audio.metadata.duration_seconds if audio else None,
            sample_rate=audio.metadata.sample_rate if audio else None,
            channels=audio.metadata.channels if audio else None,
            codec_name=audio.metadata.codec_name if audio else None,
            silence_ratio=audio.silence_ratio if audio else None,
        ),
        artifacts=TranscriptArtifactsOutput(),
        options=options,
    )
