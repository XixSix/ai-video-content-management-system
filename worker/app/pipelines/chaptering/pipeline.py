import logging

from app.db import chaptering_repository
from app.db.client import get_db_session
from app.pipelines.chaptering.candidates import generate_boundary_candidates
from app.pipelines.chaptering.errors import TerminalChapteringPipelineError
from app.pipelines.chaptering.scoring import score_boundary
from app.pipelines.chaptering.selection import select_boundaries
from app.pipelines.chaptering.titles import chapter_summary, chapter_text, chapter_title
from app.pipelines.chaptering.units import build_chapter_units
from app.pipelines.chaptering.validation import validate_transcript
from app.schemas.chaptering.output import (
    ChapteringCompletedOutput,
    ChapteringJobOptions,
    ChapteringOutputSummary,
)
from app.schemas.chaptering.result import (
    CHAPTER_SOURCE_RULE_BASED,
    RULE_BASED_CHAPTERING_MODEL,
    ChapterCandidate,
    ChapteringResult,
    ChapteringTranscript,
    ChapteringTranscriptSegment,
)
from app.schemas.jobs.chaptering_message import ChapteringJobMessage

logger = logging.getLogger(__name__)


def run_chaptering_pipeline(
    message: ChapteringJobMessage,
    *,
    options: ChapteringJobOptions,
) -> ChapteringCompletedOutput:
    """Generate rule-based video chapters from persisted transcript segments."""
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
    result = _generate_chapters(transcript, options)

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


def _generate_chapters(
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
) -> ChapteringResult:
    media_duration = _media_duration(transcript)
    units = build_chapter_units(transcript.segments)
    candidates = generate_boundary_candidates(
        units,
        media_duration=media_duration,
        min_chapter_duration=options.min_chapter_duration,
        max_chapters=options.max_chapters,
    )
    boundaries = select_boundaries(
        transcript.segments,
        media_duration=media_duration,
        min_duration=options.min_chapter_duration,
        target_duration=options.target_chapter_duration,
        max_chapters=options.max_chapters,
        candidate_times=[candidate.time for candidate in candidates],
    )
    chapters: list[ChapterCandidate] = []

    for index, start_time in enumerate(boundaries, start=1):
        end_time = boundaries[index] if index < len(boundaries) else media_duration
        chapter_segments = _segments_in_range(transcript.segments, start_time, end_time)
        text = chapter_text(chapter_segments)
        chapters.append(
            ChapterCandidate(
                chapter_index=index,
                start_time=start_time,
                end_time=end_time,
                title=chapter_title(text, index),
                summary=chapter_summary(text),
                text=text,
                score=score_boundary(
                    transcript.segments,
                    start_time=start_time,
                    previous_start=boundaries[index - 2] if index > 1 else 0.0,
                    target_duration=options.target_chapter_duration,
                ),
            )
        )

    return ChapteringResult(
        transcript_id=transcript.id,
        transcript_version=transcript.version,
        source=CHAPTER_SOURCE_RULE_BASED,
        model=RULE_BASED_CHAPTERING_MODEL,
        chapters=chapters,
    )


def _media_duration(transcript: ChapteringTranscript) -> float:
    if transcript.media_duration is not None and transcript.media_duration > 0:
        return transcript.media_duration

    return max(segment.end_time for segment in transcript.segments)


def _segments_in_range(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
    end_time: float,
) -> list[ChapteringTranscriptSegment]:
    return [
        segment
        for segment in segments
        if segment.end_time > start_time and segment.start_time < end_time
    ]


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
