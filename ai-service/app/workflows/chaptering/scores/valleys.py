"""Detect chapter boundary valleys from a lexical cohesion curve.

Flow:
    1. Read each gap's `lexical_cohesion_score` as a timeline curve.
    2. Smooth the curve with a moving average to reduce noisy local spikes.
    3. Treat points lower than both direct neighbors as candidate valleys.
    4. Score each valley by how far it drops from nearby left/right peaks.
    5. Keep valleys above the configured minimum depth.
    6. Suppress nearby valleys so one topic shift produces one candidate.
"""

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
    """Detect TextTiling-style topic-shift valleys.

    Flow:
        1. Return no candidates when fewer than three gaps are available,
           because a valley needs left, current, and right points.
        2. Build a lexical cohesion curve from the scored gaps and smooth it
           using `config.smoothing_radius`.
        3. Find local minima: points whose smoothed cohesion is lower than
           both direct neighbors.
        4. Attach `valley_depth_score` by comparing each local minimum with
           nearby peaks inside `config.peak_window`.
        5. Drop valleys below `config.min_valley_depth`.
        6. Keep the strongest valley when multiple candidates are closer than
           `min_candidate_distance_seconds`.

    Notes:
        This step does not invent or move boundary timestamps. Returned gaps
        keep the original transcript gap time and only add valley strength.
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
