from uuid import UUID

from app.pipelines.chaptering.candidates import generate_boundary_candidates
from app.pipelines.chaptering.schemas import ChapterUnit


def _unit(index: int, *, start_time: float, end_time: float) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index:04d}",
        start_time=start_time,
        end_time=end_time,
        text=f"Unit {index}.",
        clean_text=f"Unit {index}.",
        segment_ids=[UUID(f"00000000-0000-4000-8000-{index:012d}")],
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
