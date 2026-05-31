import logging

from app.core.config import settings
from app.db import chaptering_repository
from app.db.client import get_db_session
from app.pipelines.chaptering.errors import TerminalChapteringPipelineError
from app.pipelines.chaptering.strategies.candidate_chapter import (
    _generate_candidate_chapters,
)
from app.pipelines.chaptering.strategies.rule_based_chapter import (
    _generate_rule_based_chapters,
)
from app.pipelines.chaptering.validation import validate_transcript
from app.schemas.chaptering.output import (
    ChapteringCompletedOutput,
    ChapteringJobOptions,
    ChapteringOutputSummary,
)
from app.schemas.chaptering.result import (
    ChapteringResult,
    ChapteringTranscript,
)
from app.schemas.jobs.chaptering_message import ChapteringJobMessage

logger = logging.getLogger(__name__)


def run_chaptering_pipeline(
    message: ChapteringJobMessage,
    *,
    options: ChapteringJobOptions,
) -> ChapteringCompletedOutput:
    """Generate video chapters from persisted transcript segments."""
    job_id = str(message.job_id)
    logger.info("Starting chaptering pipeline job_id=%s", job_id)

    with get_db_session() as session:
        transcript = chaptering_repository.load_transcript_for_chaptering(
            session,
            transcript_id=str(message.transcript_id),
            media_id=str(message.media_id),
        )

    if transcript is None:
        raise TerminalChapteringPipelineError(
            "Transcript was not found for chaptering",
            error_code="TRANSCRIPT_NOT_FOUND",
        )

    validate_transcript(transcript, message)

    result = _generate_chapters_for_configured_strategy(transcript, options)

    with get_db_session() as session:
        persisted = chaptering_repository.save_chapters(
            session,
            job_id=job_id,
            media_id=str(message.media_id),
            transcript_id=str(message.transcript_id),
            transcript_version=message.transcript_version,
            chapters=result.chapters,
            source=result.source,
        )

    return _completed_output(persisted, options=options)


def _generate_chapters_for_configured_strategy(
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
) -> ChapteringResult:
    if settings.chaptering_pipeline_strategy == "rule_based":
        return _generate_rule_based_chapters(transcript, options)

    return _generate_candidate_chapters(transcript, options)


def _completed_output(
    chaptering: chaptering_repository.PersistedChapteringSummary,
    *,
    options: ChapteringJobOptions,
) -> ChapteringCompletedOutput:
    return ChapteringCompletedOutput(
        transcript_id=chaptering.transcript_id,
        transcript_version=chaptering.transcript_version,
        model=chaptering.model,
        chapter_count=len(chaptering.chapters),
        chapters=[
            ChapteringOutputSummary(
                id=chapter.id,
                chapter_index=chapter.chapter_index,
                start_time=chapter.start_time,
                end_time=chapter.end_time,
                title=chapter.title,
                summary=chapter.summary,
                transcript_version=chapter.transcript_version,
                source=chapter.source,
                score=chapter.score,
                boundary_score=chapter.boundary_score,
                pause_score=chapter.pause_score,
                discourse_marker_score=chapter.discourse_marker_score,
                semantic_shift_score=chapter.semantic_shift_score,
                duration_score=chapter.duration_score,
            )
            for chapter in chaptering.chapters
        ],
        options=options,
    )
