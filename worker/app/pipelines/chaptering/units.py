import re

from app.pipelines.chaptering.schemas import ChapterUnit
from app.schemas.chaptering.result import ChapteringTranscriptSegment

SENTENCE_END_RE = re.compile(r"[.!?。！？…]['\")\]]*$")


def build_chapter_units(
    segments: list[ChapteringTranscriptSegment],
    *,
    max_unit_duration: float,
    pause_boundary_seconds: float,
) -> list[ChapterUnit]:
    """Merge ASR segments into sentence-like units while preserving timing.

    A long positive gap closes the current unit before the next segment is
    appended. Overlapping segments produce a negative gap and are treated as
    continuous audio by this step.
    """
    units: list[ChapterUnit] = []
    current: list[ChapteringTranscriptSegment] = []

    for segment in segments:
        if not segment.text.strip():
            continue
        
        # Check if long pause
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
    duration = segments[-1].end_time - segments[0].start_time
    return bool(SENTENCE_END_RE.search(text)) or duration >= max_unit_duration


def _starts_after_long_pause(
    previous: ChapteringTranscriptSegment,
    current: ChapteringTranscriptSegment,
    *,
    pause_boundary_seconds: float,
) -> bool:
    """Return true only when the current segment starts after a long pause."""
    return current.start_time - previous.end_time >= pause_boundary_seconds


def _unit_from_segments(
    index: int,
    segments: list[ChapteringTranscriptSegment],
) -> ChapterUnit:
    text = _join_text(segments)
    return ChapterUnit(
        unit_id=f"unit_{index + 1:04d}",
        start_time=segments[0].start_time,
        end_time=segments[-1].end_time,
        text=text,
        clean_text=_normalize_text(
            " ".join(
                (segment.clean_text or segment.text).strip()
                for segment in segments
                if (segment.clean_text or segment.text).strip()
            )
        ),
        segment_ids=[segment.id for segment in segments],
    )


def _join_text(segments: list[ChapteringTranscriptSegment]) -> str:
    return _normalize_text(
        " ".join(segment.text.strip() for segment in segments if segment.text.strip())
    )


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()
