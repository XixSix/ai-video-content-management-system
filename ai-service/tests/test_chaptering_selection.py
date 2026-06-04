from app.workflows.chaptering.schemas import ChapterBoundaryCandidate
from app.workflows.chaptering.selection import select_boundaries_from_candidates


def test_candidate_selection_always_starts_at_zero_and_uses_candidate_times() -> None:
    candidates = [
        _candidate(20, score=0.8),
        _candidate(40, score=0.8),
        _candidate(60, score=0.8),
    ]

    boundaries = select_boundaries_from_candidates(
        candidates,
        media_duration=90,
        min_duration=10,
        target_duration=20,
        max_duration=25,
        max_chapters=4,
    )

    assert boundaries[0] == 0
    assert boundaries == sorted(boundaries)
    assert set(boundaries[1:]).issubset({20, 40, 60})


def test_candidate_selection_prefers_score_before_target_distance() -> None:
    boundaries = select_boundaries_from_candidates(
        [
            _candidate(20, score=0.2),
            _candidate(30, score=0.9),
        ],
        media_duration=70,
        min_duration=10,
        target_duration=20,
        max_duration=40,
        max_chapters=2,
    )

    assert boundaries == [0, 30]


def test_candidate_selection_respects_min_and_max_non_final_durations() -> None:
    boundaries = select_boundaries_from_candidates(
        [
            _candidate(8, score=1.0),
            _candidate(20, score=0.5),
            _candidate(50, score=1.0),
        ],
        media_duration=80,
        min_duration=10,
        target_duration=20,
        max_duration=25,
        max_chapters=3,
    )

    assert boundaries == [0, 20]


def test_candidate_selection_avoids_too_short_final_chapter() -> None:
    boundaries = select_boundaries_from_candidates(
        [
            _candidate(20, score=0.8),
            _candidate(50, score=1.0),
        ],
        media_duration=60,
        min_duration=15,
        target_duration=20,
        max_duration=35,
        max_chapters=3,
    )

    assert boundaries == [0, 20]


def test_candidate_selection_respects_max_chapters() -> None:
    boundaries = select_boundaries_from_candidates(
        [
            _candidate(20, score=0.8),
            _candidate(40, score=0.8),
            _candidate(60, score=0.8),
        ],
        media_duration=90,
        min_duration=10,
        target_duration=20,
        max_duration=30,
        max_chapters=2,
    )

    assert boundaries == [0, 20]


def _candidate(time: float, *, score: float) -> ChapterBoundaryCandidate:
    return ChapterBoundaryCandidate(
        time=time,
        unit_index=int(time),
        unit_id=f"unit_{int(time):04d}",
        previous_unit_ids=[f"unit_{int(time) - 1:04d}"],
        next_unit_ids=[f"unit_{int(time):04d}"],
        candidate_score=score,
    )
