from app.workflows.chaptering.candidate_ranking import (
    prepare_boundary_candidates_for_review,
    rank_final_boundary_candidates,
)
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    ChapterCandidate,
)


def test_high_score_candidates_are_retained_even_when_not_evenly_spaced() -> None:
    candidates = [
        _candidate(10, lexical=0.1),
        _candidate(20, lexical=0.1),
        _candidate(30, lexical=0.1),
        _candidate(50, valley=1.0, lexical=1.0),
        _candidate(70, lexical=0.1),
        _candidate(90, lexical=0.1),
    ]

    prepared = prepare_boundary_candidates_for_review(
        candidates,
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )

    assert 50 in [candidate.time for candidate in prepared]


def test_ranking_preserves_broad_timeline_coverage() -> None:
    candidates = [
        _candidate(10, lexical=0.1),
        _candidate(20, lexical=0.1),
        _candidate(30, lexical=0.1),
        _candidate(40, lexical=0.1),
        _candidate(50, lexical=0.1),
        _candidate(60, lexical=0.1),
    ]

    prepared = prepare_boundary_candidates_for_review(
        candidates,
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )

    times = [candidate.time for candidate in prepared]
    assert 10 in times
    assert 60 in times


def test_raw_semantic_and_lexical_shift_do_not_increase_candidate_score() -> None:
    prepared = prepare_boundary_candidates_for_review(
        [
            _candidate(10, valley=0.4),
            _candidate(20, valley=0.4, lexical=1.0, semantic_shift=1.0),
        ],
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )
    by_time = {candidate.time: candidate for candidate in prepared}

    assert by_time[10].candidate_score == by_time[20].candidate_score


def test_boundary_quality_penalty_reduces_candidate_score() -> None:
    prepared = prepare_boundary_candidates_for_review(
        [
            _candidate(10, valley=0.4, quality=1.0),
            _candidate(20, valley=0.4, quality=0.0),
        ],
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )
    by_time = {candidate.time: candidate for candidate in prepared}

    assert by_time[10].candidate_score == 0.4
    assert by_time[20].candidate_score == 0.3


def test_nearby_candidates_collapse_to_strongest_score() -> None:
    prepared = prepare_boundary_candidates_for_review(
        [
            _candidate(20, lexical=0.2),
            _candidate(25, valley=1.0, lexical=1.0),
            _candidate(50, lexical=0.2),
        ],
        max_chapters=3,
        min_candidate_distance_seconds=10,
        config=_retention_config(limit=6),
    )

    assert 25 in [candidate.time for candidate in prepared]
    assert 20 not in [candidate.time for candidate in prepared]


def test_prepare_candidates_retains_top_score_and_timeline_coverage() -> None:
    prepared = prepare_boundary_candidates_for_review(
        [
            _candidate(10, valley=0.1),
            _candidate(20, valley=0.9),
            _candidate(30, valley=0.2),
            _candidate(40, valley=0.8),
        ],
        max_chapters=1,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=2),
    )

    times = [candidate.time for candidate in prepared]
    assert 20 in times
    assert 10 in times or 40 in times


def test_final_ranking_boosts_positive_llm_judgment() -> None:
    ranked = rank_final_boundary_candidates(
        [
            _candidate(
                10,
                candidate_score=0.2,
                llm_is_boundary=True,
                llm_confidence=0.9,
            )
        ]
    )

    assert ranked[0].candidate_score == 0.41


def test_final_ranking_penalizes_negative_llm_judgment() -> None:
    ranked = rank_final_boundary_candidates(
        [
            _candidate(
                10,
                candidate_score=0.2,
                llm_is_boundary=False,
                llm_confidence=0.9,
            )
        ]
    )

    assert ranked[0].candidate_score == 0.0


def test_final_ranking_preserves_score_without_llm_judgment() -> None:
    ranked = rank_final_boundary_candidates([_candidate(10, candidate_score=0.2)])

    assert ranked[0].candidate_score == 0.2


def _candidate(
    time: float,
    *,
    cheap: float = 0.0,
    valley: float = 0.0,
    lexical: float = 0.0,
    semantic_shift: float = 0.0,
    marker: float = 0.0,
    pause: float = 0.0,
    duration: float = 0.0,
    quality: float = 1.0,
    candidate_score: float = 0.0,
    llm_is_boundary: bool | None = None,
    llm_confidence: float = 0.0,
) -> ChapterCandidate:
    return ChapterCandidate(
        time=time,
        unit_index=int(time),
        unit_id=f"unit_{int(time):04d}",
        left_adjacent_unit_ids=[f"unit_{int(time) - 1:04d}"],
        right_adjacent_unit_ids=[f"unit_{int(time):04d}"],
        cheap_score=cheap,
        semantic_shift_score=semantic_shift,
        semantic_cohesion_score=1.0 - semantic_shift if semantic_shift else 0.0,
        valley_depth_score=valley,
        lexical_shift_score=lexical,
        discourse_marker_score=marker,
        pause_score=pause,
        duration_sanity_score=duration,
        boundary_quality_score=quality,
        candidate_score=candidate_score,
        llm_is_boundary=llm_is_boundary,
        llm_confidence_score=llm_confidence,
    )


def _retention_config(*, limit: int) -> CandidateRetentionConfig:
    return CandidateRetentionConfig(
        min_limit=limit,
        max_limit=limit,
        multiplier=2,
        top_score_fraction=0.5,
    )
