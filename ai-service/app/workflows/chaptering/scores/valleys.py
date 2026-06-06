"""Detect chapter boundary valleys from lexical and semantic cohesion curves.

Flow:
    1. Read each gap's lexical cohesion score.
    2. Read each gap's semantic cohesion score when embeddings are available.
    3. Detect valleys independently for each curve.
    4. Combine component valley depths with the configured semantic weight.
    5. Keep valleys above the configured minimum depth.
    6. Suppress nearby valleys so one topic shift produces one candidate.
"""

from dataclasses import replace

from app.workflows.chaptering.scores.common import clamp_score
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
    """Detect TextTiling-style topic-shift valleys from independent curves.

    Flow:
        1. Return no candidates when fewer than three gaps are available,
           because a valley needs left, current, and right points.
        2. Compute lexical valley depths from lexical cohesion.
        3. Compute semantic valley depths from semantic cohesion only when
           embedding scores are present.
        4. Union lexical and semantic valley indexes. A missing component depth
           remains `0.0`; depth is never computed for non-valley points.
        5. Combine component depths with `config.semantic_weight`.
        6. Drop combined valleys below `config.min_valley_depth`.
        7. Keep the strongest valley when multiple candidates are closer than
           `min_candidate_distance_seconds`.

    Notes:
        This step does not invent or move boundary timestamps. Returned gaps
        keep the original transcript gap time and only add valley strength.
    """
    if len(gap_scores) < 3:
        return []

    lexical_depths_by_index = _valley_depths_by_index(
        [gap_score.lexical_cohesion_score for gap_score in gap_scores],
        config=config,
    )
    has_semantic_scores = _has_semantic_scores(gap_scores)
    semantic_depths_by_index = (
        _valley_depths_by_index(
            [gap_score.semantic_cohesion_score for gap_score in gap_scores],
            config=config,
        )
        if has_semantic_scores
        else {}
    )
    valley_indexes = sorted(
        set(lexical_depths_by_index) | set(semantic_depths_by_index)
    )
    valleys = [
        _with_combined_valley_depth(
            gap_scores[index],
            lexical_depth=lexical_depths_by_index.get(index, 0.0),
            semantic_depth=semantic_depths_by_index.get(index, 0.0),
            has_semantic_scores=has_semantic_scores,
            semantic_weight=config.semantic_weight,
        )
        for index in valley_indexes
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


def _has_semantic_scores(gap_scores: list[ChapterGapScore]) -> bool:
    """Return true when at least one gap has semantic cohesion metadata."""
    return any(
        gap_score.semantic_shift_score > 0.0 or gap_score.semantic_cohesion_score > 0.0
        for gap_score in gap_scores
    )


def _valley_depths_by_index(
    values: list[float],
    *,
    config: ValleyDetectionConfig,
) -> dict[int, float]:
    """Return valley depths for local minima in one cohesion curve."""
    smoothed = _smooth_values(values, radius=config.smoothing_radius)

    return {
        index: _valley_depth(smoothed, index, peak_window=config.peak_window)
        for index in range(1, len(smoothed) - 1)
        if _is_local_minimum(smoothed, index)
    }


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


def _valley_depth(
    smoothed: list[float],
    index: int,
    *,
    peak_window: int,
) -> float:
    """Return valley depth from nearby left and right peaks."""
    left_start = max(0, index - peak_window)
    right_end = min(len(smoothed), index + peak_window + 1)
    left_peak = max(smoothed[left_start:index], default=smoothed[index])
    right_peak = max(smoothed[index + 1 : right_end], default=smoothed[index])
    depth = max(0.0, left_peak - smoothed[index]) + max(
        0.0,
        right_peak - smoothed[index],
    )

    return round(depth, 4)


def _with_combined_valley_depth(
    gap_score: ChapterGapScore,
    *,
    lexical_depth: float,
    semantic_depth: float,
    has_semantic_scores: bool,
    semantic_weight: float,
) -> ChapterGapScore:
    """Attach component and final valley depths to the original gap score."""
    semantic_weight = clamp_score(semantic_weight)
    lexical_weight = 1.0 - semantic_weight
    lexical_depth = clamp_score(lexical_depth)
    semantic_depth = clamp_score(semantic_depth)
    valley_depth = (
        semantic_weight * semantic_depth + lexical_weight * lexical_depth
        if has_semantic_scores
        else lexical_depth
    )

    return replace(
        gap_score,
        lexical_valley_depth_score=round(lexical_depth, 4),
        semantic_valley_depth_score=round(semantic_depth, 4),
        valley_depth_score=round(clamp_score(valley_depth), 4),
    )


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
