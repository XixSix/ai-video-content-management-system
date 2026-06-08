import math
from collections.abc import Sequence

from app.schemas.chaptering import ChapterBoundaryScores, ChapteringTranscriptSegment
from app.workflows.chaptering.scores.common import clamp_score
from app.workflows.chaptering.scores.temporal import (
    pause_score as calculate_pause_score,
)
from app.workflows.chaptering.scores.transition_markers import transition_marker_score

LONG_PAUSE_SECONDS = 1.2


def score_boundary(
    segments: list[ChapteringTranscriptSegment],
    *,
    start_time: float,
    previous_start: float,
    target_duration: float,
    semantic_shift: float = 0.0,
) -> ChapterBoundaryScores:
    """Score a deterministic chapter boundary candidate.

    The score combines target-duration fit, transition marker strength, pause
    length before the boundary, and optional semantic shift from embeddings.
    Start time `0` is treated as a valid fixed opening boundary.
    """
    if start_time == 0:
        return ChapterBoundaryScores(
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
        segment.start_seconds - previous_segment.end_seconds
        if segment and previous_segment
        else 0.0
    )
    pause_score = calculate_pause_score(
        pause,
        long_pause_seconds=LONG_PAUSE_SECONDS,
        max_pause_score_seconds=3.0,
    )
    discourse_score = (
        transition_marker_score(segment.clean_text or segment.text) if segment else 0.0
    )
    duration = start_time - previous_start
    duration_score = (
        1.0 - clamp_score(abs(duration - target_duration) / target_duration)
        if target_duration > 0
        else 0.0
    )
    boundary_score = (
        0.35 * duration_score + 0.30 * discourse_score + 0.25 * pause_score + 0.10
    )

    return ChapterBoundaryScores(
        score=round(boundary_score, 4),
        boundary_score=round(boundary_score, 4),
        pause_score=round(pause_score, 4),
        discourse_marker_score=round(discourse_score, 4),
        semantic_shift_score=round(clamp_score(semantic_shift), 4),
        duration_score=round(duration_score, 4),
    )


def cosine_similarity(
    left_embedding: Sequence[float],
    right_embedding: Sequence[float],
) -> float | None:
    """Return cosine similarity for two embeddings, or `None` if invalid."""
    if not left_embedding or len(left_embedding) != len(right_embedding):
        return None

    dot_product = 0.0
    left_norm_squared = 0.0
    right_norm_squared = 0.0

    for left_value, right_value in zip(left_embedding, right_embedding):
        if not math.isfinite(left_value) or not math.isfinite(right_value):
            return None

        dot_product += left_value * right_value
        left_norm_squared += left_value * left_value
        right_norm_squared += right_value * right_value

    if left_norm_squared <= 0.0 or right_norm_squared <= 0.0:
        return None

    similarity = dot_product / (
        math.sqrt(left_norm_squared) * math.sqrt(right_norm_squared)
    )
    return max(-1.0, min(similarity, 1.0))


def semantic_shift_score(
    left_embedding: Sequence[float],
    right_embedding: Sequence[float],
) -> float:
    """Return normalized semantic shift score from left and right embeddings."""
    similarity = cosine_similarity(left_embedding, right_embedding)
    if similarity is None:
        return 0.0

    return clamp_score(1.0 - similarity)


def segment_at_or_after(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
) -> ChapteringTranscriptSegment | None:
    """Return the first segment starting at or after a boundary time."""
    return next(
        (segment for segment in segments if segment.start_seconds >= start_time), None
    )


def previous_segment_before(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
) -> ChapteringTranscriptSegment | None:
    """Return the last segment before a boundary time."""
    previous = [segment for segment in segments if segment.start_seconds < start_time]
    return previous[-1] if previous else None
