import pytest

from app.workflows.generate_chapters.schemas import (
    ChapterGapScore,
    ValleyDetectionConfig,
)
from app.workflows.generate_chapters.scores.valleys import detect_valley_candidates


def test_strong_cohesion_drop_creates_valley_candidate() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.82),
            _gap(2, 20, 0.78),
            _gap(3, 30, 0.22),
            _gap(4, 40, 0.76),
            _gap(5, 50, 0.80),
        ],
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=0, min_valley_depth=0.3),
    )

    assert [valley.time for valley in valleys] == [30]
    assert valleys[0].lexical_valley_depth_score == 1.0
    assert valleys[0].semantic_valley_depth_score == 0.0
    assert valleys[0].valley_depth_score == 1.0


def test_semantic_shift_can_create_valley_when_lexical_curve_is_flat() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.80, semantic_shift=0.05),
            _gap(2, 20, 0.80, semantic_shift=0.10),
            _gap(3, 30, 0.80, semantic_shift=0.90),
            _gap(4, 40, 0.80, semantic_shift=0.10),
            _gap(5, 50, 0.80, semantic_shift=0.05),
        ],
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=0, min_valley_depth=0.3),
    )

    assert [valley.time for valley in valleys] == [30]
    assert valleys[0].lexical_valley_depth_score == 0.0
    assert valleys[0].semantic_valley_depth_score == 1.0
    assert valleys[0].valley_depth_score == 0.7


def test_lexical_valley_combines_with_zero_semantic_component() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.82, semantic_shift=0.20),
            _gap(2, 20, 0.78, semantic_shift=0.20),
            _gap(3, 30, 0.22, semantic_shift=0.20),
            _gap(4, 40, 0.76, semantic_shift=0.20),
            _gap(5, 50, 0.80, semantic_shift=0.20),
        ],
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=0, min_valley_depth=0.2),
    )

    assert [valley.time for valley in valleys] == [30]
    assert valleys[0].lexical_valley_depth_score == 1.0
    assert valleys[0].semantic_valley_depth_score == 0.0
    assert valleys[0].valley_depth_score == 0.3


def test_valley_semantic_weight_zero_uses_lexical_depth() -> None:
    valleys = detect_valley_candidates(
        _mixed_valley_gaps(),
        min_candidate_distance_seconds=10,
        config=_config(
            smoothing_radius=0,
            min_valley_depth=0.1,
            semantic_weight=0.0,
        ),
    )

    assert valleys[0].lexical_valley_depth_score == pytest.approx(0.8)
    assert valleys[0].semantic_valley_depth_score == 1.0
    assert valleys[0].valley_depth_score == pytest.approx(0.8)


def test_valley_semantic_weight_one_uses_semantic_depth() -> None:
    valleys = detect_valley_candidates(
        _mixed_valley_gaps(),
        min_candidate_distance_seconds=10,
        config=_config(
            smoothing_radius=0,
            min_valley_depth=0.1,
            semantic_weight=1.0,
        ),
    )

    assert valleys[0].lexical_valley_depth_score == pytest.approx(0.8)
    assert valleys[0].semantic_valley_depth_score == 1.0
    assert valleys[0].valley_depth_score == 1.0


def test_combined_valley_depth_is_clamped() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.95, semantic_shift=0.05),
            _gap(2, 20, 0.95, semantic_shift=0.05),
            _gap(3, 30, 0.00, semantic_shift=1.00),
            _gap(4, 40, 0.95, semantic_shift=0.05),
            _gap(5, 50, 0.95, semantic_shift=0.05),
        ],
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=0, min_valley_depth=0.1),
    )

    assert valleys[0].lexical_valley_depth_score == 1.0
    assert valleys[0].semantic_valley_depth_score == 1.0
    assert valleys[0].valley_depth_score == 1.0


def test_flat_lexical_and_semantic_curves_return_no_valleys() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.80, semantic_shift=0.20),
            _gap(2, 20, 0.80, semantic_shift=0.20),
            _gap(3, 30, 0.80, semantic_shift=0.20),
            _gap(4, 40, 0.80, semantic_shift=0.20),
            _gap(5, 50, 0.80, semantic_shift=0.20),
        ],
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=0, min_valley_depth=0.1),
    )

    assert valleys == []


def test_small_noisy_dip_is_ignored_after_smoothing() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.80),
            _gap(2, 20, 0.76),
            _gap(3, 30, 0.74),
            _gap(4, 40, 0.77),
            _gap(5, 50, 0.79),
        ],
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=1, min_valley_depth=0.18),
    )

    assert valleys == []


def test_nearby_valleys_keep_only_strongest_candidate() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.70),
            _gap(2, 20, 0.30),
            _gap(3, 30, 0.60),
            _gap(4, 38, 0.20),
            _gap(5, 48, 0.65),
            _gap(6, 70, 0.62),
        ],
        min_candidate_distance_seconds=25,
        config=_config(smoothing_radius=0, min_valley_depth=0.3),
    )

    assert [valley.time for valley in valleys] == [38]


def test_edge_gaps_are_not_treated_as_local_valleys() -> None:
    valleys = detect_valley_candidates(
        [
            _gap(1, 10, 0.20),
            _gap(2, 20, 0.82),
            _gap(3, 30, 0.78),
            _gap(4, 40, 0.22),
        ],
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=0, min_valley_depth=0.3),
    )

    assert valleys == []


def test_valley_times_match_original_gap_times() -> None:
    gap_scores = [
        _gap(1, 12.5, 0.80),
        _gap(2, 27.75, 0.18),
        _gap(3, 41.25, 0.82),
    ]

    valleys = detect_valley_candidates(
        gap_scores,
        min_candidate_distance_seconds=10,
        config=_config(smoothing_radius=0, min_valley_depth=0.3),
    )

    assert valleys[0].time == gap_scores[1].time
    assert valleys[0].unit_index == gap_scores[1].unit_index


def _config(
    *,
    smoothing_radius: int = 1,
    peak_window: int = 2,
    min_valley_depth: float = 0.18,
    semantic_weight: float = 0.70,
) -> ValleyDetectionConfig:
    return ValleyDetectionConfig(
        smoothing_radius=smoothing_radius,
        peak_window=peak_window,
        min_valley_depth=min_valley_depth,
        semantic_weight=semantic_weight,
    )


def _mixed_valley_gaps() -> list[ChapterGapScore]:
    return [
        _gap(1, 10, 0.80, semantic_shift=0.30),
        _gap(2, 20, 0.60, semantic_shift=0.40),
        _gap(3, 30, 0.40, semantic_shift=0.80),
        _gap(4, 40, 0.60, semantic_shift=0.40),
        _gap(5, 50, 0.80, semantic_shift=0.30),
    ]


def _gap(
    index: int,
    time: float,
    lexical_cohesion: float,
    *,
    semantic_shift: float | None = None,
) -> ChapterGapScore:
    semantic_shift_score = semantic_shift or 0.0
    semantic_cohesion_score = 1 - semantic_shift if semantic_shift is not None else 0.0

    return ChapterGapScore(
        time=time,
        unit_index=index,
        unit_id=f"unit_{index + 1:04d}",
        left_adjacent_unit_ids=[f"unit_{index:04d}"],
        right_adjacent_unit_ids=[f"unit_{index + 1:04d}"],
        left_text="left context",
        right_text="right context",
        left_unit_ids=[f"unit_{index:04d}"],
        right_unit_ids=[f"unit_{index + 1:04d}"],
        lexical_cohesion_score=lexical_cohesion,
        lexical_shift_score=1 - lexical_cohesion,
        semantic_shift_score=semantic_shift_score,
        semantic_cohesion_score=semantic_cohesion_score,
    )
