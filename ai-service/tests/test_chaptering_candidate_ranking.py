from app.workflows.chaptering.candidate_ranking import rank_boundary_candidates
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

    ranked = rank_boundary_candidates(
        candidates,
        semantic_shift_scores_by_time={},
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )

    assert 50 in [candidate.time for candidate in ranked]


def test_ranking_preserves_broad_timeline_coverage() -> None:
    candidates = [
        _candidate(10, lexical=0.1),
        _candidate(20, lexical=0.1),
        _candidate(30, lexical=0.1),
        _candidate(40, lexical=0.1),
        _candidate(50, lexical=0.1),
        _candidate(60, lexical=0.1),
    ]

    ranked = rank_boundary_candidates(
        candidates,
        semantic_shift_scores_by_time={},
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )

    times = [candidate.time for candidate in ranked]
    assert 10 in times
    assert 60 in times


def test_semantic_scores_increase_final_candidate_score() -> None:
    ranked = rank_boundary_candidates(
        [
            _candidate(10, lexical=0.2),
            _candidate(20, lexical=0.2),
        ],
        semantic_shift_scores_by_time={20: 0.8},
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )
    by_time = {candidate.time: candidate for candidate in ranked}

    assert by_time[20].semantic_shift_score == 0.8
    assert by_time[20].candidate_score > by_time[10].candidate_score


def test_nearby_candidates_collapse_to_strongest_score() -> None:
    ranked = rank_boundary_candidates(
        [
            _candidate(20, lexical=0.2),
            _candidate(25, valley=1.0, lexical=1.0),
            _candidate(50, lexical=0.2),
        ],
        semantic_shift_scores_by_time={},
        max_chapters=3,
        min_candidate_distance_seconds=10,
        config=_retention_config(limit=6),
    )

    assert 25 in [candidate.time for candidate in ranked]
    assert 20 not in [candidate.time for candidate in ranked]


def _candidate(
    time: float,
    *,
    valley: float = 0.0,
    lexical: float = 0.0,
    marker: float = 0.0,
    pause: float = 0.0,
    duration: float = 0.0,
) -> ChapterCandidate:
    return ChapterCandidate(
        time=time,
        unit_index=int(time),
        unit_id=f"unit_{int(time):04d}",
        previous_unit_ids=[f"unit_{int(time) - 1:04d}"],
        next_unit_ids=[f"unit_{int(time):04d}"],
        valley_depth_score=valley,
        lexical_shift_score=lexical,
        discourse_marker_score=marker,
        pause_score=pause,
        duration_sanity_score=duration,
    )


def _retention_config(*, limit: int) -> CandidateRetentionConfig:
    return CandidateRetentionConfig(
        min_limit=limit,
        max_limit=limit,
        multiplier=2,
        top_score_fraction=0.5,
    )
