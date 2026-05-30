from app.pipelines.chaptering.scoring import score_boundary
from app.schemas.chaptering.result import ChapteringTranscriptSegment


def select_boundaries(
    segments: list[ChapteringTranscriptSegment],
    *,
    media_duration: float,
    min_duration: float,
    target_duration: float,
    max_chapters: int,
) -> list[float]:
    """Select deterministic chapter starts from transcript segment boundaries.

    The selector is the current deterministic fallback before embedding/LLM
    segmentation. It always starts at ``0`` and then searches for the next
    boundary inside a duration window after the previous chapter start.

    Args:
        segments: Ordered transcript segments used as possible boundary points.
        media_duration: Total media duration in seconds.
        min_duration: Minimum allowed chapter duration in seconds.
        target_duration: Preferred chapter duration in seconds.
        max_chapters: Maximum number of chapter starts to return.

    Returns:
        Chapter start times in ascending order. The first item is always ``0``.

    Notes:
        Candidate boundaries come from existing transcript segment start times.
        The search window enforces ``min_duration``, avoids leaving a too-short
        final chapter, and caps how far past ``target_duration`` a chapter can
        grow. When several candidates fit the window, the highest scoring
        boundary is selected, with distance to ``target_duration`` used as a tie
        breaker.
    """
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
                score_boundary(
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
