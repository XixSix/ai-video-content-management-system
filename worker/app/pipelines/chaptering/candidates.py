from app.pipelines.chaptering.schemas import ChapterBoundaryCandidate, ChapterUnit


def generate_boundary_candidates(
    units: list[ChapterUnit],
    *,
    media_duration: float,
    min_chapter_duration: float,
    max_chapters: int,
    density_multiplier: int,
) -> list[ChapterBoundaryCandidate]:
    """Create candidate chapter starts from sentence-like unit boundaries.

    Candidate times come only from ``ChapterUnit.start_time`` values after the
    first unit. The generator filters starts that would create an invalid first
    or final chapter, then keeps a bounded but evenly distributed candidate set
    for later semantic scoring.
    """
    if len(units) < 2 or media_duration <= 0 or max_chapters <= 1:
        return []

    candidates = [
        _candidate_from_unit(units, unit_index)
        for unit_index, unit in enumerate(units[1:], start=1)
        if _is_valid_candidate_time(
            unit.start_time,
            media_duration=media_duration,
            min_chapter_duration=min_chapter_duration,
        )
    ]

    max_candidates = max(1, max_chapters * density_multiplier)
    if len(candidates) <= max_candidates:
        return candidates

    return _downsample_evenly(candidates, max_candidates)


def _candidate_from_unit(
    units: list[ChapterUnit],
    unit_index: int,
) -> ChapterBoundaryCandidate:
    unit = units[unit_index]
    return ChapterBoundaryCandidate(
        time=unit.start_time,
        unit_index=unit_index,
        unit_id=unit.unit_id,
        previous_unit_ids=[units[unit_index - 1].unit_id],
        next_unit_ids=[unit.unit_id],
    )


def _is_valid_candidate_time(
    time: float,
    *,
    media_duration: float,
    min_chapter_duration: float,
) -> bool:
    return (
        time >= min_chapter_duration
        and media_duration - time >= min_chapter_duration
    )


def _downsample_evenly(
    candidates: list[ChapterBoundaryCandidate],
    max_candidates: int,
) -> list[ChapterBoundaryCandidate]:
    """Keep candidates spread across the full timeline when density is high."""
    if max_candidates == 1:
        return [candidates[0]]

    last_index = len(candidates) - 1
    selected_indexes = {
        round(index * last_index / (max_candidates - 1))
        for index in range(max_candidates)
    }
    return [
        candidate
        for index, candidate in enumerate(candidates)
        if index in selected_indexes
    ]
