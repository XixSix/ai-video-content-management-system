import re

from app.schemas.chaptering import ChapteringTranscriptSegment
from app.workflows.chaptering.schemas import ChapterUnit

SENTENCE_END_RE = re.compile(r"[.!?。！？…]['\")\]]*$")


def build_chapter_units(
    segments: list[ChapteringTranscriptSegment],
    *,
    max_unit_duration: float,
    pause_boundary_seconds: float,
) -> list[ChapterUnit]:
    """Merge ASR segments into stable chapter analysis units.

    The builder skips empty segments, starts a new unit after a configured long
    pause, appends each segment to the current buffer, and closes the unit when
    buffered text ends with sentence punctuation or exceeds max duration.

    Notes:
        This step builds workflow DTOs only. It does not mutate transcript text
        or attempt ASR repair.
    """
    units: list[ChapterUnit] = []
    current: list[ChapteringTranscriptSegment] = []

    for segment in segments:
        if not segment.text.strip():
            continue

        if current and _starts_after_long_pause(
            current[-1],
            segment,
            pause_boundary_seconds=pause_boundary_seconds,
        ):
            units.append(_unit_from_segments(len(units), current))
            current = []

        current.append(segment)

        if _has_sentence_end_or_exceeds_max_duration(
            current,
            max_unit_duration=max_unit_duration,
        ):
            units.append(_unit_from_segments(len(units), current))
            current = []

    if current:
        units.append(_unit_from_segments(len(units), current))

    return units


def _has_sentence_end_or_exceeds_max_duration(
    segments: list[ChapteringTranscriptSegment],
    *,
    max_unit_duration: float,
) -> bool:
    """Return true when buffered text has sentence punctuation or is too long."""
    text = _join_text(segments)
    duration = segments[-1].end_seconds - segments[0].start_seconds
    return bool(SENTENCE_END_RE.search(text)) or duration >= max_unit_duration


def _starts_after_long_pause(
    previous: ChapteringTranscriptSegment,
    current: ChapteringTranscriptSegment,
    *,
    pause_boundary_seconds: float,
) -> bool:
    """Return true only when the current segment starts after a long pause."""
    return current.start_seconds - previous.end_seconds >= pause_boundary_seconds


def _unit_from_segments(
    index: int,
    segments: list[ChapteringTranscriptSegment],
) -> ChapterUnit:
    text = _join_text(segments)
    return ChapterUnit(
        unit_id=f"unit_{index + 1:04d}",
        start_time=segments[0].start_seconds,
        end_time=segments[-1].end_seconds,
        text=text,
        clean_text=_normalize_text(
            " ".join(
                (segment.clean_text or segment.text).strip()
                for segment in segments
                if (segment.clean_text or segment.text).strip()
            )
        ),
        segment_ids=[segment.segment_id for segment in segments],
    )


def _join_text(segments: list[ChapteringTranscriptSegment]) -> str:
    """Join raw segment text with normalized whitespace."""
    return _normalize_text(
        " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    )


def _normalize_text(text: str) -> str:
    """Collapse repeated whitespace."""
    return re.sub(r"\s+", " ", text).strip()
