from app.workflows.chaptering.candidate_ranking import rank_boundary_candidates
from app.workflows.chaptering.candidates import retain_candidates_for_boundary_review
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
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )

    times = [candidate.time for candidate in ranked]
    assert 10 in times
    assert 60 in times


def test_raw_semantic_and_lexical_shift_do_not_increase_candidate_score() -> None:
    ranked = rank_boundary_candidates(
        [
            _candidate(10, valley=0.4),
            _candidate(20, valley=0.4, lexical=1.0, semantic_shift=1.0),
        ],
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )
    by_time = {candidate.time: candidate for candidate in ranked}

    assert by_time[10].candidate_score == by_time[20].candidate_score


def test_boundary_quality_penalty_reduces_candidate_score() -> None:
    ranked = rank_boundary_candidates(
        [
            _candidate(10, valley=0.4, quality=1.0),
            _candidate(20, valley=0.4, quality=0.0),
        ],
        max_chapters=2,
        min_candidate_distance_seconds=1,
        config=_retention_config(limit=4),
    )
    by_time = {candidate.time: candidate for candidate in ranked}

    assert by_time[10].candidate_score == 0.4
    assert by_time[20].candidate_score == 0.3


def test_nearby_candidates_collapse_to_strongest_score() -> None:
    ranked = rank_boundary_candidates(
        [
            _candidate(20, lexical=0.2),
            _candidate(25, valley=1.0, lexical=1.0),
            _candidate(50, lexical=0.2),
        ],
        max_chapters=3,
        min_candidate_distance_seconds=10,
        config=_retention_config(limit=6),
    )

    assert 25 in [candidate.time for candidate in ranked]
    assert 20 not in [candidate.time for candidate in ranked]


def test_boundary_review_retention_prefers_valley_scores_when_present() -> None:
    retained = retain_candidates_for_boundary_review(
        [
            _candidate(10, valley=0.0, cheap=1.0),
            _candidate(20, valley=0.8, cheap=0.1),
            _candidate(30, valley=0.1, cheap=0.9),
            _candidate(40, valley=0.0, cheap=0.8),
        ],
        media_duration=120,
        target_chapter_duration=30,
        config=_retention_config(limit=2),
    )

    assert 20 in [candidate.time for candidate in retained]


def test_boundary_review_retention_falls_back_to_cheap_scores_without_valleys() -> None:
    retained = retain_candidates_for_boundary_review(
        [
            _candidate(10, cheap=0.1),
            _candidate(20, cheap=0.9),
            _candidate(30, cheap=0.2),
            _candidate(40, cheap=0.8),
        ],
        media_duration=120,
        target_chapter_duration=30,
        config=_retention_config(limit=2),
    )

    assert 20 in [candidate.time for candidate in retained]


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
) -> ChapterCandidate:
    return ChapterCandidate(
        time=time,
        unit_index=int(time),
        unit_id=f"unit_{int(time):04d}",
        previous_unit_ids=[f"unit_{int(time) - 1:04d}"],
        next_unit_ids=[f"unit_{int(time):04d}"],
        cheap_score=cheap,
        semantic_shift_score=semantic_shift,
        semantic_cohesion_score=1.0 - semantic_shift if semantic_shift else 0.0,
        valley_depth_score=valley,
        lexical_shift_score=lexical,
        discourse_marker_score=marker,
        pause_score=pause,
        duration_sanity_score=duration,
        boundary_quality_score=quality,
    )


def _retention_config(*, limit: int) -> CandidateRetentionConfig:
    return CandidateRetentionConfig(
        min_limit=limit,
        max_limit=limit,
        multiplier=2,
        top_score_fraction=0.5,
    )
