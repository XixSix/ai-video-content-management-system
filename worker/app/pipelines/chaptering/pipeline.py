import logging
import re

from app.db import chaptering_repository
from app.db.client import get_db_session
from app.schemas.chaptering.output import (
    ChapteringCompletedOutput,
    ChapteringJobOptions,
    ChapteringOutputSummary,
)
from app.schemas.chaptering.result import (
    CHAPTER_SOURCE_RULE_BASED,
    RULE_BASED_CHAPTERING_MODEL,
    ChapterBoundaryScore,
    ChapterCandidate,
    ChapteringResult,
    ChapteringTranscript,
    ChapteringTranscriptSegment,
)
from app.schemas.jobs.chaptering_message import ChapteringJobMessage

logger = logging.getLogger(__name__)

TRANSITION_MARKERS = (
    "dau tien",
    "đầu tiên",
    "tiep theo",
    "tiếp theo",
    "phan tiep theo",
    "phần tiếp theo",
    "bay gio",
    "bây giờ",
    "sang phan",
    "sang phần",
    "tom lai",
    "tóm lại",
    "cuoi cung",
    "cuối cùng",
    "quan trong nhat",
    "quan trọng nhất",
    "first",
    "next",
    "now",
    "finally",
    "in summary",
)
LONG_PAUSE_SECONDS = 1.2
TITLE_MAX_LENGTH = 80
SUMMARY_MAX_LENGTH = 180


class TerminalChapteringPipelineError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)


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

    _validate_transcript(transcript, message)
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


def _validate_transcript(
    transcript: ChapteringTranscript,
    message: ChapteringJobMessage,
) -> None:
    """Reject empty, stale, unsorted, or out-of-range transcript inputs."""
    if transcript.version != message.transcript_version:
        raise TerminalChapteringPipelineError(
            "Transcript version does not match chaptering message",
            error_code="TRANSCRIPT_VERSION_MISMATCH",
        )

    if not transcript.segments:
        raise TerminalChapteringPipelineError(
            "Transcript has no timestamped segments",
            error_code="TRANSCRIPT_EMPTY",
        )

    has_text = False
    previous_start = -1.0

    for segment in transcript.segments:
        if segment.start_time >= segment.end_time:
            raise TerminalChapteringPipelineError(
                "Transcript segment startTime must be before endTime",
                error_code="TRANSCRIPT_INVALID_TIMESTAMPS",
            )

        if segment.start_time < previous_start:
            raise TerminalChapteringPipelineError(
                "Transcript segments must be sorted by timestamp",
                error_code="TRANSCRIPT_UNSORTED",
            )

        if (
            transcript.media_duration is not None
            and segment.end_time > transcript.media_duration + 1.0
        ):
            raise TerminalChapteringPipelineError(
                "Transcript segment exceeds media duration",
                error_code="TRANSCRIPT_OUT_OF_RANGE",
            )

        has_text = has_text or bool(segment.text.strip())
        previous_start = segment.start_time

    if not has_text:
        raise TerminalChapteringPipelineError(
            "Transcript text is empty",
            error_code="TRANSCRIPT_EMPTY",
        )


def _generate_chapters(
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
) -> ChapteringResult:
    media_duration = _media_duration(transcript)
    boundaries = _select_boundaries(
        transcript.segments,
        media_duration=media_duration,
        min_duration=options.min_chapter_duration,
        target_duration=options.target_chapter_duration,
        max_chapters=options.max_chapters,
    )
    chapters: list[ChapterCandidate] = []

    for index, start_time in enumerate(boundaries, start=1):
        end_time = boundaries[index] if index < len(boundaries) else media_duration
        chapter_segments = _segments_in_range(transcript.segments, start_time, end_time)
        text = _chapter_text(chapter_segments)
        chapters.append(
            ChapterCandidate(
                chapter_index=index,
                start_time=start_time,
                end_time=end_time,
                title=_chapter_title(text, index),
                summary=_chapter_summary(text),
                text=text,
                score=_score_boundary(
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


def _select_boundaries(
    segments: list[ChapteringTranscriptSegment],
    *,
    media_duration: float,
    min_duration: float,
    target_duration: float,
    max_chapters: int,
) -> list[float]:
    boundaries = [0.0]
    candidate_times = [segment.start_time for segment in segments[1:]]

    while len(boundaries) < max_chapters:
        previous = boundaries[-1]
        if media_duration - previous <= target_duration * 1.35:
            break

        lower = previous + min_duration
        upper = min(media_duration - min_duration, previous + target_duration * 1.6)
        if lower > upper:
            break

        candidates = [time for time in candidate_times if lower <= time <= upper]
        if not candidates:
            break

        target = previous + target_duration
        best_time = max(
            candidates,
            key=lambda time: (
                _score_boundary(
                    segments,
                    start_time=time,
                    previous_start=previous,
                    target_duration=target_duration,
                ).score,
                -abs(time - target),
            ),
        )
        boundaries.append(best_time)

    return boundaries


def _score_boundary(
    segments: list[ChapteringTranscriptSegment],
    *,
    start_time: float,
    previous_start: float,
    target_duration: float,
) -> ChapterBoundaryScore:
    if start_time == 0:
        return ChapterBoundaryScore(
            score=1.0,
            boundary_score=1.0,
            pause_score=0.0,
            discourse_marker_score=0.0,
            semantic_shift_score=0.0,
            duration_score=1.0,
        )

    segment = _segment_at_or_after(segments, start_time)
    previous_segment = _previous_segment(segments, start_time)
    pause = (
        segment.start_time - previous_segment.end_time
        if segment and previous_segment
        else 0.0
    )
    pause_score = _clamp(pause / 3.0) if pause >= LONG_PAUSE_SECONDS else 0.0
    discourse_score = (
        1.0 if segment and _starts_with_transition_marker(segment.text) else 0.0
    )
    duration = start_time - previous_start
    duration_score = 1.0 - _clamp(abs(duration - target_duration) / target_duration)
    boundary_score = (
        0.35 * duration_score + 0.30 * discourse_score + 0.25 * pause_score + 0.10
    )

    return ChapterBoundaryScore(
        score=round(boundary_score, 4),
        boundary_score=round(boundary_score, 4),
        pause_score=round(pause_score, 4),
        discourse_marker_score=discourse_score,
        semantic_shift_score=0.0,
        duration_score=round(duration_score, 4),
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


def _chapter_text(segments: list[ChapteringTranscriptSegment]) -> str:
    return " ".join(
        segment.text.strip() for segment in segments if segment.text.strip()
    )


def _chapter_title(text: str, index: int) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return f"Phần {index}"

    first_sentence = re.split(r"(?<=[.!?。])\s+", cleaned, maxsplit=1)[0]
    title = first_sentence[:TITLE_MAX_LENGTH].strip()

    if len(first_sentence) > TITLE_MAX_LENGTH:
        title = f"{title.rstrip()}..."

    return title or f"Phần {index}"


def _chapter_summary(text: str) -> str | None:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return None

    summary = cleaned[:SUMMARY_MAX_LENGTH].strip()
    if len(cleaned) > SUMMARY_MAX_LENGTH:
        summary = f"{summary.rstrip()}..."

    return summary


def _starts_with_transition_marker(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    return any(normalized.startswith(marker) for marker in TRANSITION_MARKERS)


def _segment_at_or_after(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
) -> ChapteringTranscriptSegment | None:
    return next(
        (segment for segment in segments if segment.start_time >= start_time), None
    )


def _previous_segment(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
) -> ChapteringTranscriptSegment | None:
    previous = [segment for segment in segments if segment.start_time < start_time]
    return previous[-1] if previous else None


def _clamp(value: float) -> float:
    return max(0.0, min(value, 1.0))


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
