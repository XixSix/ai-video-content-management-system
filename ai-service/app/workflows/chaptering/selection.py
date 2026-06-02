from app.schemas.chaptering import ChapteringTranscriptSegment
from app.workflows.chaptering.scoring import score_boundary


def select_boundaries(
    segments: list[ChapteringTranscriptSegment],
    *,
    media_duration: float,
    min_duration: float,
    target_duration: float,
    max_chapters: int,
    candidate_times: list[float] | None = None,
) -> list[float]:
    """Select deterministic chapter starts from candidate boundaries.

    The selector always starts at `0` and repeatedly chooses the best candidate
    inside a duration window after the previous start. It avoids creating a
    final chapter that is shorter than the minimum duration.
    """
    boundaries = [0.0]
    candidate_times = (
        candidate_times
        if candidate_times is not None
        else [segment.start_seconds for segment in segments[1:]]
    )

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
                ).score
                or 0.0,
                -abs(time - target),
            ),
        )
        boundaries.append(best_time)

    return boundaries
