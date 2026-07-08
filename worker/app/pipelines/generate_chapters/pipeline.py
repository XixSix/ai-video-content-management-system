import logging

from app.db import chapters_repository
from app.db.client import get_db_session
from app.schemas.db.processsing_job import ProcessingJobRow
from app.schemas.chapters.input import GenerateChaptersOptions
from app.schemas.chapters.output import GenerateChaptersJobOutput
from app.schemas.chapters.result import GenerateChaptersTranscript
from app.services.ai_service import AIServiceTerminalError, ai_service_client

logger = logging.getLogger(__name__)


class TerminalGenerateChaptersPipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


def run_generate_chapters_pipeline(
    job: ProcessingJobRow,
    *,
    transcript_id: str,
    transcript_version: int,
    options: GenerateChaptersOptions,
) -> GenerateChaptersJobOutput:
    """Run chapter generation AI processing and return the completed payload."""
    job_id = str(job.id)
    transcript = _load_transcript(job, transcript_id=transcript_id)

    logger.info("Starting chapter generation pipeline job_id=%s", job_id)

    _validate_transcript_for_ai_service(
        transcript,
        transcript_version=transcript_version,
    )

    try:
        result = ai_service_client.generate_chapters(
            request_id=job_id,
            transcript=transcript,
            options=options,
        )

        with get_db_session() as session:
            chapters = chapters_repository.save_chapters(
                session,
                job_id=job_id,
                media_id=str(job.media_id),
                transcript_id=transcript_id,
                transcript_version=transcript_version,
                chapters=result.chapters,
                source=result.source,
                model=result.model,
            )

    except AIServiceTerminalError as error:
        raise TerminalGenerateChaptersPipelineError(
            str(error),
            error_code=error.error_code,
        ) from error

    return _completed_output(chapters)


def _load_transcript(
    job: ProcessingJobRow,
    *,
    transcript_id: str,
) -> GenerateChaptersTranscript:
    with get_db_session() as session:
        transcript = chapters_repository.load_transcript_for_chapters(
            session,
            transcript_id=transcript_id,
            media_id=str(job.media_id),
        )

    if transcript is None:
        raise TerminalGenerateChaptersPipelineError(
            "Transcript was not found for chapter generation",
            error_code="TRANSCRIPT_NOT_FOUND",
        )

    return transcript


def _validate_transcript_for_ai_service(
    transcript: GenerateChaptersTranscript,
    *,
    transcript_version: int,
) -> None:
    if transcript.version != transcript_version:
        raise TerminalGenerateChaptersPipelineError(
            "Transcript version does not match generate chapters job",
            error_code="TRANSCRIPT_VERSION_MISMATCH",
        )

    if transcript.media_duration is None or transcript.media_duration <= 0:
        raise TerminalGenerateChaptersPipelineError(
            "Media duration is required for chapter generation",
            error_code="MEDIA_DURATION_INVALID",
        )

    if not transcript.segments:
        raise TerminalGenerateChaptersPipelineError(
            "Transcript has no timestamped segments",
            error_code="TRANSCRIPT_EMPTY",
        )

    previous_start = -1.0
    for index, segment in enumerate(transcript.segments):
        if segment.start_time >= segment.end_time:
            raise TerminalGenerateChaptersPipelineError(
                f"Transcript segment {index} has invalid timestamps",
                error_code="TRANSCRIPT_SEGMENT_INVALID",
            )
        if segment.start_time < previous_start:
            raise TerminalGenerateChaptersPipelineError(
                "Transcript segments are not sorted",
                error_code="TRANSCRIPT_SEGMENTS_UNSORTED",
            )
        if segment.end_time > transcript.media_duration + 1.0:
            raise TerminalGenerateChaptersPipelineError(
                f"Transcript segment {index} exceeds media duration",
                error_code="TRANSCRIPT_SEGMENT_OUT_OF_RANGE",
            )
        if not segment.text.strip():
            raise TerminalGenerateChaptersPipelineError(
                f"Transcript segment {index} text is empty",
                error_code="TRANSCRIPT_SEGMENT_EMPTY",
            )
        previous_start = segment.start_time


def _completed_output(
    chapter_summary: chapters_repository.PersistedChaptersSummary,
) -> GenerateChaptersJobOutput:
    """Build the persisted processing job output from saved chapters."""
    return GenerateChaptersJobOutput(
        transcript_id=chapter_summary.transcript_id,
        transcript_version=chapter_summary.transcript_version,
        chapter_count=len(chapter_summary.chapters),
    )
