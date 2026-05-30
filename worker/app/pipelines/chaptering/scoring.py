import re

from app.schemas.chaptering.result import (
    ChapterBoundaryScore,
    ChapteringTranscriptSegment,
)

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


def score_boundary(
    segments: list[ChapteringTranscriptSegment],
    *,
    start_time: float,
    previous_start: float,
    target_duration: float,
) -> ChapterBoundaryScore:
    """Score a deterministic chapter boundary candidate.

    Args:
        segments: Ordered transcript segments used to inspect text and pauses.
        start_time: Candidate chapter start time in seconds.
        previous_start: Previous chapter start time in seconds.
        target_duration: Preferred chapter duration in seconds.

    Returns:
        Boundary score metadata. ``score`` and ``boundary_score`` are the
        weighted final score. ``semantic_shift_score`` is currently ``0`` and is
        reserved for the embedding-based phase.

    Notes:
        The fallback score combines how close the candidate is to
        ``target_duration``, whether the boundary text starts with a transition
        marker, and whether there is a long pause before the boundary.
    """
    if start_time == 0:
        return ChapterBoundaryScore(
            score=1.0,
            boundary_score=1.0,
            pause_score=0.0,
            discourse_marker_score=0.0,
            semantic_shift_score=0.0,
            duration_score=1.0,
        )

    segment = segment_at_or_after(segments, start_time)
    previous_segment = previous_segment_before(segments, start_time)
    pause = (
        segment.start_time - previous_segment.end_time
        if segment and previous_segment
        else 0.0
    )
    pause_score = _clamp(pause / 3.0) if pause >= LONG_PAUSE_SECONDS else 0.0
    discourse_score = (
        1.0 if segment and starts_with_transition_marker(segment.text) else 0.0
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


def starts_with_transition_marker(text: str) -> bool:
    """Return whether text starts with a known chapter transition phrase."""
    normalized = re.sub(r"\s+", " ", text.strip().lower())
    return any(normalized.startswith(marker) for marker in TRANSITION_MARKERS)


def segment_at_or_after(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
) -> ChapteringTranscriptSegment | None:
    """Return the first segment starting at or after a boundary time."""
    return next(
        (segment for segment in segments if segment.start_time >= start_time), None
    )


def previous_segment_before(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
) -> ChapteringTranscriptSegment | None:
    """Return the last segment before a boundary time."""
    previous = [segment for segment in segments if segment.start_time < start_time]
    return previous[-1] if previous else None


def _clamp(value: float) -> float:
    return max(0.0, min(value, 1.0))
