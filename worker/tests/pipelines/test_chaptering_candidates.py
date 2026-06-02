from dataclasses import replace
from uuid import UUID

from app.pipelines.chaptering.candidates import (
    generate_boundary_candidates,
    retain_candidates_for_embedding,
    score_boundary_candidates,
)
from app.pipelines.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapterBoundaryCandidate,
    ChapterUnit,
)


def _unit(index: int, *, start_time: float, end_time: float) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index:04d}",
        start_time=start_time,
        end_time=end_time,
        text=f"Unit {index}.",
        clean_text=f"Unit {index}.",
        segment_ids=[UUID(f"00000000-0000-4000-8000-{index:012d}")],
    )


def _candidate(index: int, *, time: float) -> ChapterBoundaryCandidate:
    return ChapterBoundaryCandidate(
        time=time,
        unit_index=index,
        unit_id=f"unit_{index + 1:04d}",
        previous_unit_ids=[f"unit_{index:04d}"],
        next_unit_ids=[f"unit_{index + 1:04d}"],
    )


def _scoring_config() -> CandidateScoringConfig:
    return CandidateScoringConfig(
        context_seconds=60.0,
        long_pause_seconds=1.2,
        max_pause_score_seconds=3.0,
        min_context_text_chars=120,
        discourse_marker_weight=0.30,
        pause_weight=0.25,
        lexical_shift_weight=0.20,
        boundary_quality_weight=0.15,
        duration_sanity_weight=0.10,
    )


def _retention_config() -> CandidateRetentionConfig:
    return CandidateRetentionConfig(
        min_limit=80,
        max_limit=150,
        multiplier=10,
        top_score_fraction=0.70,
    )


def test_generate_boundary_candidates_uses_unit_starts_after_first_unit() -> None:
    units = [
        _unit(1, start_time=0.0, end_time=50.0),
        _unit(2, start_time=50.0, end_time=100.0),
        _unit(3, start_time=100.0, end_time=150.0),
    ]

    candidates = generate_boundary_candidates(
        units,
        media_duration=180.0,
        min_chapter_duration=45.0,
    )

    assert [candidate.time for candidate in candidates] == [50.0, 100.0]
    assert candidates[0].unit_index == 1
    assert candidates[0].previous_unit_ids == ["unit_0001"]
    assert candidates[0].next_unit_ids == ["unit_0002"]


def test_generate_boundary_candidates_filters_invalid_chapter_lengths() -> None:
    units = [
        _unit(1, start_time=0.0, end_time=20.0),
        _unit(2, start_time=20.0, end_time=80.0),
        _unit(3, start_time=80.0, end_time=170.0),
        _unit(4, start_time=170.0, end_time=200.0),
    ]

    candidates = generate_boundary_candidates(
        units,
        media_duration=200.0,
        min_chapter_duration=60.0,
    )

    assert [candidate.time for candidate in candidates] == [80.0]


def test_generate_boundary_candidates_keeps_all_hard_valid_candidates() -> None:
    units = [
        _unit(index, start_time=float(index * 10), end_time=float(index * 10 + 5))
        for index in range(20)
    ]

    candidates = generate_boundary_candidates(
        units,
        media_duration=220.0,
        min_chapter_duration=10.0,
    )

    assert len(candidates) == 19
    assert candidates[0].time == 10.0
    assert candidates[-1].time == 190.0


def test_score_boundary_candidates_attaches_cheap_scores() -> None:
    units = [
        _unit(1, start_time=0.0, end_time=60.0),
        ChapterUnit(
            unit_id="unit_0002",
            start_time=63.0,
            end_time=120.0,
            text="Now let's talk about distribution channels.",
            clean_text="Now let's talk about distribution channels.",
            segment_ids=[UUID("00000000-0000-4000-8000-000000000002")],
        ),
        _unit(3, start_time=120.0, end_time=180.0),
    ]
    candidates = generate_boundary_candidates(
        units,
        media_duration=180.0,
        min_chapter_duration=45.0,
    )

    scored = score_boundary_candidates(
        units,
        candidates,
        media_duration=180.0,
        min_chapter_duration=45.0,
        config=_scoring_config(),
    )

    assert scored[0].time == 63.0
    assert scored[0].cheap_score > 0.0
    assert scored[0].discourse_marker_score == 1.0
    assert scored[0].pause_score == 1.0


def test_retain_candidates_for_embedding_keeps_top_scores_and_coverage() -> None:
    candidates = [
        replace(_candidate(index, time=float(index * 5)), cheap_score=0.01)
        for index in range(1, 201)
    ]
    high_score_candidate = replace(candidates[149], cheap_score=1.0)
    candidates[149] = high_score_candidate

    retained = retain_candidates_for_embedding(
        candidates,
        media_duration=1800.0,
        target_chapter_duration=180.0,
        config=_retention_config(),
    )

    assert len(retained) == 100
    assert high_score_candidate in retained
    assert retained[-1].time == candidates[-1].time
    assert [candidate.time for candidate in retained] == sorted(
        candidate.time for candidate in retained
    )
