import logging

from app.pipelines.chaptering.schemas import ChapterBoundaryCandidate, ChapterUnit

logger = logging.getLogger(__name__)


def generate_boundary_candidates(
    units: list[ChapterUnit],
    *,
    media_duration: float,
    min_chapter_duration: float,
) -> list[ChapterBoundaryCandidate]:
    """Create candidate chapter starts from sentence-like unit boundaries.

    Candidate times come only from ``ChapterUnit.start_time`` values after the
    first unit. The generator only filters starts that would create an invalid
    first or final chapter, then returns every hard-valid candidate for later
    cheap scoring and semantic retention.

    Notes:
        This phase does not cap candidates, downsample evenly, use target
        chapter duration, call embeddings, or select final chapter starts.
    """
    if len(units) < 2 or media_duration <= 0:
        logger.info(
            "Chaptering candidate generation skipped units=%s media_duration=%.2f",
            len(units),
            media_duration,
        )
        return []

    candidates: list[ChapterBoundaryCandidate] = []
    raw_candidate_count = len(units) - 1

    # Loop all units except the first one
    for unit_index, unit in enumerate(units[1:], start=1):
        if _is_valid_candidate_time(
            unit.start_time,
            media_duration=media_duration,
            min_chapter_duration=min_chapter_duration,
        ):
            candidates.append(_candidate_from_unit(units, unit_index))

    logger.info(
        "Chaptering candidate generation units=%s raw_candidates=%s "
        "invalid_candidates=%s valid_candidates=%s retained_candidates=%s "
        "downsampled=%s",
        len(units),
        raw_candidate_count,
        raw_candidate_count - len(candidates),
        len(candidates),
        len(candidates),
        False,
    )
    return candidates


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
        time >= min_chapter_duration and media_duration - time >= min_chapter_duration
    )
