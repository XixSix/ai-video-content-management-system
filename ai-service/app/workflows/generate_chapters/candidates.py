import logging
from collections.abc import Iterable
from dataclasses import replace

from app.workflows.generate_chapters.scores.common import clamp_score
from app.workflows.generate_chapters.scores.lexical import (
    lexical_shift_score as calculate_lexical_shift_score,
)
from app.workflows.generate_chapters.scores.quality import (
    boundary_quality_score as calculate_boundary_quality_score,
)
from app.workflows.generate_chapters.scores.temporal import (
    duration_sanity_score as calculate_duration_sanity_score,
    pause_score as calculate_pause_score,
)
from app.workflows.generate_chapters.schemas import (
    CandidateScoringConfig,
    ChapterCandidate,
    ChapterUnit,
)
from app.workflows.generate_chapters.scores.transition_markers import (
    transition_marker_score,
)

logger = logging.getLogger(__name__)


def generate_boundary_candidates(
    units: list[ChapterUnit],
    *,
    media_duration: float,
    min_chapter_duration: float,
) -> list[ChapterCandidate]:
    """Create candidate chapter starts from real unit boundaries.

    The generator only rejects boundaries that would violate hard duration
    constraints. It does not downsample or select final chapters.
    """
    if len(units) < 2 or media_duration <= 0:
        return []

    candidates: list[ChapterCandidate] = []
    for unit_index, unit in enumerate(units[1:], start=1):
        if _is_valid_candidate_time(
            unit.start_time,
            media_duration=media_duration,
            min_chapter_duration=min_chapter_duration,
        ):
            candidates.append(_candidate_from_unit(units, unit_index))

    return candidates


def score_boundary_candidates(
    units: list[ChapterUnit],
    candidates: list[ChapterCandidate],
    *,
    media_duration: float,
    min_chapter_duration: float,
    config: CandidateScoringConfig,
) -> list[ChapterCandidate]:
    """Attach cheap local transcript scores to every hard-valid candidate."""
    return [
        _score_candidate(
            units,
            candidate,
            media_duration=media_duration,
            min_chapter_duration=min_chapter_duration,
            config=config,
        )
        for candidate in candidates
    ]


def _candidate_from_unit(
    units: list[ChapterUnit],
    unit_index: int,
) -> ChapterCandidate:
    unit = units[unit_index]
    return ChapterCandidate(
        time=unit.start_time,
        unit_index=unit_index,
        unit_id=unit.unit_id,
        left_adjacent_unit_ids=[units[unit_index - 1].unit_id],
        right_adjacent_unit_ids=[unit.unit_id],
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


def _score_candidate(
    units: list[ChapterUnit],
    candidate: ChapterCandidate,
    *,
    media_duration: float,
    min_chapter_duration: float,
    config: CandidateScoringConfig,
) -> ChapterCandidate:
    previous_unit = units[candidate.unit_index - 1]
    current_unit = units[candidate.unit_index]
    left_text = _context_text_before_candidate(
        units,
        candidate.unit_index,
        context_seconds=config.context_seconds,
    )
    right_text = _context_text_after_candidate(
        units,
        candidate.unit_index,
        context_seconds=config.context_seconds,
    )

    discourse_marker_score = transition_marker_score(current_unit.clean_text)
    pause_score = calculate_pause_score(
        current_unit.start_time - previous_unit.end_time,
        long_pause_seconds=config.long_pause_seconds,
        max_pause_score_seconds=config.max_pause_score_seconds,
    )
    lexical_shift_score = calculate_lexical_shift_score(left_text, right_text)
    boundary_quality_score = calculate_boundary_quality_score(
        left_text,
        right_text,
        min_context_text_chars=config.min_context_text_chars,
    )
    duration_sanity_score = calculate_duration_sanity_score(
        candidate.time,
        media_duration=media_duration,
        min_chapter_duration=min_chapter_duration,
    )
    cheap_score = (
        config.discourse_marker_weight * discourse_marker_score
        + config.pause_weight * pause_score
        + config.boundary_quality_weight * boundary_quality_score
        + config.duration_sanity_weight * duration_sanity_score
    )

    return replace(
        candidate,
        cheap_score=round(clamp_score(cheap_score), 4),
        discourse_marker_score=round(discourse_marker_score, 4),
        pause_score=round(pause_score, 4),
        lexical_shift_score=round(lexical_shift_score, 4),
        boundary_quality_score=round(boundary_quality_score, 4),
        duration_sanity_score=round(duration_sanity_score, 4),
    )


def _context_text_before_candidate(
    units: list[ChapterUnit],
    candidate_unit_index: int,
    *,
    context_seconds: float,
) -> str:
    candidate_time = units[candidate_unit_index].start_time
    earliest_start = candidate_time - context_seconds
    return _join_unit_text(
        unit for unit in units[:candidate_unit_index] if unit.end_time > earliest_start
    )


def _context_text_after_candidate(
    units: list[ChapterUnit],
    candidate_unit_index: int,
    *,
    context_seconds: float,
) -> str:
    candidate_time = units[candidate_unit_index].start_time
    latest_end = candidate_time + context_seconds
    return _join_unit_text(
        unit for unit in units[candidate_unit_index:] if unit.start_time < latest_end
    )


def _join_unit_text(units: Iterable[ChapterUnit]) -> str:
    return " ".join(
        unit.clean_text or unit.text for unit in units if (unit.clean_text or unit.text)
    ).strip()
