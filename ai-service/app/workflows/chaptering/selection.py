from app.schemas.chaptering import ChapteringTranscriptSegment
from app.workflows.chaptering.scores.scoring import score_boundary
from app.workflows.chaptering.schemas import ChapterBoundaryCandidate


def select_boundaries_from_candidates(
    candidates: list[ChapterBoundaryCandidate],
    *,
    media_duration: float,
    min_duration: float,
    target_duration: float,
    max_duration: float,
    max_chapters: int,
) -> list[float]:
    """Select valid chapter starts from ranked boundary candidates.

    Selection never creates new boundary times. It repeatedly picks the
    highest-scoring candidate that fits the chapter duration constraints and
    would not leave a too-short final chapter.
    """
    boundaries = [0.0]
    sorted_candidates = sorted(candidates, key=lambda candidate: candidate.time)

    while len(boundaries) < max_chapters:
        previous = boundaries[-1]
        eligible_candidates = [
            candidate
            for candidate in sorted_candidates
            if _is_valid_next_boundary(
                candidate.time,
                previous=previous,
                media_duration=media_duration,
                min_duration=min_duration,
                max_duration=max_duration,
            )
        ]
        if not eligible_candidates:
            break

        target = previous + target_duration
        best_candidate = max(
            eligible_candidates,
            key=lambda candidate: (
                candidate.candidate_score,
                -abs(candidate.time - target),
            ),
        )
        boundaries.append(best_candidate.time)

    return boundaries


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


def _is_valid_next_boundary(
    time: float,
    *,
    previous: float,
    media_duration: float,
    min_duration: float,
    max_duration: float,
) -> bool:
    duration = time - previous
    return (
        duration >= min_duration
        and duration <= max_duration
        and media_duration - time >= min_duration
    )
