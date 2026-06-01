from uuid import UUID

from app.pipelines.chaptering.schemas import ChapterBoundaryCandidate, ChapterUnit
from app.pipelines.chaptering.windows import build_context_windows


def _unit(index: int, *, start_time: float, end_time: float) -> ChapterUnit:
    return ChapterUnit(
        unit_id=f"unit_{index:04d}",
        start_time=start_time,
        end_time=end_time,
        text=f"Unit {index} text.",
        clean_text=f"Unit {index} clean.",
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


def test_build_context_windows_maps_candidate_to_left_and_right_unit_ids() -> None:
    units = [
        _unit(1, start_time=0.0, end_time=60.0),
        _unit(2, start_time=60.0, end_time=120.0),
        _unit(3, start_time=120.0, end_time=180.0),
        _unit(4, start_time=180.0, end_time=240.0),
    ]

    windows = build_context_windows(
        units,
        [_candidate(2, time=120.0)],
        context_duration=90.0,
    )

    assert len(windows) == 1
    assert windows[0].candidate_time == 120.0
    assert windows[0].left_unit_ids == ["unit_0001", "unit_0002"]
    assert windows[0].right_unit_ids == ["unit_0003", "unit_0004"]
    assert windows[0].left_text == "Unit 1 clean. Unit 2 clean."
    assert windows[0].right_text == "Unit 3 clean. Unit 4 clean."


def test_build_context_windows_overlap_for_nearby_candidates() -> None:
    units = [
        _unit(1, start_time=0.0, end_time=60.0),
        _unit(2, start_time=60.0, end_time=120.0),
        _unit(3, start_time=120.0, end_time=180.0),
        _unit(4, start_time=180.0, end_time=240.0),
        _unit(5, start_time=240.0, end_time=300.0),
    ]

    windows = build_context_windows(
        units,
        [
            _candidate(2, time=120.0),
            _candidate(3, time=180.0),
        ],
        context_duration=120.0,
    )

    assert len(windows) == 2
    assert "unit_0003" in windows[0].right_unit_ids
    assert "unit_0003" in windows[1].left_unit_ids
    assert "unit_0004" in windows[0].right_unit_ids
    assert "unit_0004" in windows[1].right_unit_ids


def test_build_context_windows_skips_candidates_without_two_sided_context() -> None:
    units = [
        _unit(1, start_time=0.0, end_time=60.0),
        _unit(2, start_time=60.0, end_time=120.0),
    ]

    windows = build_context_windows(
        units,
        [_candidate(0, time=0.0)],
        context_duration=90.0,
    )

    assert windows == []
