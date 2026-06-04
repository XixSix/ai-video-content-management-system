from dataclasses import replace

from app.workflows.chaptering.schemas import (
    ChapterGapScore,
    ValleyDetectionConfig,
)


def detect_valley_candidates(
    gap_scores: list[ChapterGapScore],
    *,
    min_candidate_distance_seconds: float,
    config: ValleyDetectionConfig,
) -> list[ChapterGapScore]:
    """Detect TextTiling-style local valleys from scored transcript gaps.

    The detector smooths the lexical cohesion curve, finds local minima with
    enough left/right peak context, computes valley depth, and deduplicates
    nearby valleys without changing the original gap timestamps.
    """
    if len(gap_scores) < 3:
        return []

    smoothed = _smooth_values(
        [gap_score.lexical_cohesion_score for gap_score in gap_scores],
        radius=config.smoothing_radius,
    )
    valleys = [
        _with_valley_depth(gap_scores, index, smoothed, peak_window=config.peak_window)
        for index in range(1, len(gap_scores) - 1)
        if _is_local_minimum(smoothed, index)
    ]
    strong_valleys = [
        valley
        for valley in valleys
        if valley.valley_depth_score >= config.min_valley_depth
    ]

    return _suppress_nearby_valleys(
        strong_valleys,
        min_candidate_distance_seconds=min_candidate_distance_seconds,
    )


def _smooth_values(values: list[float], *, radius: int) -> list[float]:
    """Return a moving-average smoothed copy of numeric curve values."""
    if radius <= 0:
        return values

    smoothed: list[float] = []
    for index in range(len(values)):
        start = max(0, index - radius)
        end = min(len(values), index + radius + 1)
        window = values[start:end]
        smoothed.append(sum(window) / len(window))

    return smoothed


def _is_local_minimum(values: list[float], index: int) -> bool:
    """Return true when a curve point is lower than both direct neighbors."""
    return values[index] < values[index - 1] and values[index] < values[index + 1]


def _with_valley_depth(
    gap_scores: list[ChapterGapScore],
    index: int,
    smoothed: list[float],
    *,
    peak_window: int,
) -> ChapterGapScore:
    """Attach normalized valley depth to the original gap score."""
    left_start = max(0, index - peak_window)
    right_end = min(len(smoothed), index + peak_window + 1)
    left_peak = max(smoothed[left_start:index], default=smoothed[index])
    right_peak = max(smoothed[index + 1 : right_end], default=smoothed[index])
    depth = max(0.0, left_peak - smoothed[index]) + max(
        0.0,
        right_peak - smoothed[index],
    )

    return replace(gap_scores[index], valley_depth_score=round(depth, 4))


def _suppress_nearby_valleys(
    valleys: list[ChapterGapScore],
    *,
    min_candidate_distance_seconds: float,
) -> list[ChapterGapScore]:
    """Keep the strongest valley from clusters around the same topic shift."""
    if min_candidate_distance_seconds <= 0:
        return sorted(valleys, key=lambda valley: valley.time)

    selected: list[ChapterGapScore] = []
    for valley in sorted(
        valleys,
        key=lambda candidate: (-candidate.valley_depth_score, candidate.time),
    ):
        if any(
            abs(valley.time - selected_valley.time) < min_candidate_distance_seconds
            for selected_valley in selected
        ):
            continue

        selected.append(valley)

    return sorted(selected, key=lambda valley: valley.time)
