from app.workflows.chaptering.schemas import (
    ChapterCandidate,
    ChapterContextWindow,
    ChapterUnit,
)


def build_context_windows(
    units: list[ChapterUnit],
    candidates: list[ChapterCandidate],
    *,
    context_duration: float,
) -> list[ChapterContextWindow]:
    """Build two-sided transcript context around candidate boundaries.

    Candidates without both left and right context are skipped because semantic
    comparison needs meaningful text on each side of the boundary.
    """
    windows: list[ChapterContextWindow] = []

    for candidate in candidates:
        left_units = _units_before_candidate(
            units,
            candidate.unit_index,
            earliest_start=candidate.time - context_duration,
        )
        right_units = _units_after_candidate(
            units,
            candidate.unit_index,
            latest_end=candidate.time + context_duration,
        )
        if not left_units or not right_units:
            continue

        windows.append(
            ChapterContextWindow(
                candidate_time=candidate.time,
                left_text=_join_unit_text(left_units),
                right_text=_join_unit_text(right_units),
                left_unit_ids=[unit.unit_id for unit in left_units],
                right_unit_ids=[unit.unit_id for unit in right_units],
            )
        )

    return windows


def _units_before_candidate(
    units: list[ChapterUnit],
    candidate_unit_index: int,
    *,
    earliest_start: float,
) -> list[ChapterUnit]:
    """Return units before the candidate that overlap the left context window."""
    return [
        unit for unit in units[:candidate_unit_index] if unit.end_time > earliest_start
    ]


def _units_after_candidate(
    units: list[ChapterUnit],
    candidate_unit_index: int,
    *,
    latest_end: float,
) -> list[ChapterUnit]:
    """Return units from the candidate that overlap the right context window."""
    return [
        unit for unit in units[candidate_unit_index:] if unit.start_time < latest_end
    ]


def _join_unit_text(units: list[ChapterUnit]) -> str:
    """Join preferred unit text into a compact context string."""
    return " ".join(unit.clean_text or unit.text for unit in units).strip()
