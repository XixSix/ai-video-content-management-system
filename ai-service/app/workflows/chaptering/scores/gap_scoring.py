from collections.abc import Iterable
from dataclasses import replace

from app.workflows.chaptering.scores.common import clamp_score
from app.workflows.chaptering.scores.lexical import (
    lexical_cohesion_score as calculate_lexical_cohesion_score,
)
from app.workflows.chaptering.scores.quality import (
    boundary_quality_score as calculate_boundary_quality_score,
)
from app.workflows.chaptering.scores.temporal import (
    duration_sanity_score as calculate_duration_sanity_score,
    pause_score as calculate_pause_score,
)
from app.workflows.chaptering.schemas import (
    CandidateScoringConfig,
    ChapterBoundaryCandidate,
    ChapterGapScore,
    ChapterUnit,
)
from app.workflows.chaptering.scores.transition_markers import transition_marker_score


def score_unit_gaps(
    units: list[ChapterUnit],
    *,
    media_duration: float,
    min_chapter_duration: float,
    config: CandidateScoringConfig,
) -> list[ChapterGapScore]:
    """Score every hard-valid gap between adjacent timeline units.

    The scorer treats each `unit[i].start_time` as the only legal boundary time,
    builds local left/right context windows around that gap, and attaches cheap
    deterministic signals. It does not select final chapters or detect valleys.
    """
    if len(units) < 2 or media_duration <= 0:
        return []

    gap_scores: list[ChapterGapScore] = []
    for unit_index, unit in enumerate(units[1:], start=1):
        if not _is_hard_valid_gap(
            unit.start_time,
            media_duration=media_duration,
            min_chapter_duration=min_chapter_duration,
        ):
            continue

        gap_scores.append(
            _score_gap(
                units,
                unit_index,
                media_duration=media_duration,
                min_chapter_duration=min_chapter_duration,
                config=config,
            )
        )

    return gap_scores


def attach_semantic_shift_scores(
    gap_scores: list[ChapterGapScore],
    semantic_shift_scores_by_time: dict[float, float],
) -> list[ChapterGapScore]:
    """Return gap scores with optional semantic shift folded into metadata."""
    if not semantic_shift_scores_by_time:
        return gap_scores

    return [
        replace(
            gap_score,
            semantic_shift_score=round(
                clamp_score(semantic_shift_scores_by_time.get(gap_score.time, 0.0)),
                4,
            ),
        )
        for gap_score in gap_scores
    ]


def gap_scores_to_candidates(
    gap_scores: list[ChapterGapScore],
) -> list[ChapterBoundaryCandidate]:
    """Convert Phase 3 scores into existing downstream boundary candidates."""
    return [
        ChapterBoundaryCandidate(
            time=gap_score.time,
            unit_index=gap_score.unit_index,
            unit_id=gap_score.unit_id,
            previous_unit_ids=gap_score.previous_unit_ids,
            next_unit_ids=gap_score.next_unit_ids,
            cheap_score=gap_score.combined_score,
            discourse_marker_score=gap_score.discourse_marker_score,
            pause_score=gap_score.pause_score,
            lexical_shift_score=gap_score.lexical_shift_score,
            valley_depth_score=gap_score.valley_depth_score,
            boundary_quality_score=gap_score.boundary_quality_score,
            duration_sanity_score=gap_score.duration_sanity_score,
        )
        for gap_score in gap_scores
    ]


def _score_gap(
    units: list[ChapterUnit],
    unit_index: int,
    *,
    media_duration: float,
    min_chapter_duration: float,
    config: CandidateScoringConfig,
) -> ChapterGapScore:
    previous_unit = units[unit_index - 1]
    current_unit = units[unit_index]
    left_units = _context_units_before_gap(
        units,
        unit_index,
        context_seconds=config.context_seconds,
    )
    right_units = _context_units_after_gap(
        units,
        unit_index,
        context_seconds=config.context_seconds,
    )
    left_text = _join_unit_text(left_units)
    right_text = _join_unit_text(right_units)

    lexical_cohesion_score = calculate_lexical_cohesion_score(left_text, right_text)
    lexical_shift_score = clamp_score(1.0 - lexical_cohesion_score)
    discourse_marker_score = transition_marker_score(current_unit.clean_text)
    pause_score = calculate_pause_score(
        current_unit.start_time - previous_unit.end_time,
        long_pause_seconds=config.long_pause_seconds,
        max_pause_score_seconds=config.max_pause_score_seconds,
    )
    boundary_quality_score = calculate_boundary_quality_score(
        left_text,
        right_text,
        min_context_text_chars=config.min_context_text_chars,
    )
    duration_sanity_score = calculate_duration_sanity_score(
        current_unit.start_time,
        media_duration=media_duration,
        min_chapter_duration=min_chapter_duration,
    )
    combined_score = (
        config.discourse_marker_weight * discourse_marker_score
        + config.pause_weight * pause_score
        + config.lexical_shift_weight * lexical_shift_score
        + config.boundary_quality_weight * boundary_quality_score
        + config.duration_sanity_weight * duration_sanity_score
    )

    return ChapterGapScore(
        time=current_unit.start_time,
        unit_index=unit_index,
        unit_id=current_unit.unit_id,
        previous_unit_ids=[previous_unit.unit_id],
        next_unit_ids=[current_unit.unit_id],
        left_text=left_text,
        right_text=right_text,
        left_unit_ids=[unit.unit_id for unit in left_units],
        right_unit_ids=[unit.unit_id for unit in right_units],
        lexical_cohesion_score=round(lexical_cohesion_score, 4),
        lexical_shift_score=round(lexical_shift_score, 4),
        discourse_marker_score=round(discourse_marker_score, 4),
        pause_score=round(pause_score, 4),
        boundary_quality_score=round(boundary_quality_score, 4),
        duration_sanity_score=round(duration_sanity_score, 4),
        combined_score=round(clamp_score(combined_score), 4),
    )


def _context_units_before_gap(
    units: list[ChapterUnit],
    gap_unit_index: int,
    *,
    context_seconds: float,
) -> list[ChapterUnit]:
    """Return units before the gap that overlap the left context window."""
    candidate_time = units[gap_unit_index].start_time
    earliest_start = candidate_time - context_seconds
    return [unit for unit in units[:gap_unit_index] if unit.end_time > earliest_start]


def _context_units_after_gap(
    units: list[ChapterUnit],
    gap_unit_index: int,
    *,
    context_seconds: float,
) -> list[ChapterUnit]:
    """Return units from the gap that overlap the right context window."""
    candidate_time = units[gap_unit_index].start_time
    latest_end = candidate_time + context_seconds
    return [unit for unit in units[gap_unit_index:] if unit.start_time < latest_end]


def _join_unit_text(units: Iterable[ChapterUnit]) -> str:
    """Join preferred unit text into one scoring context."""
    return " ".join(
        unit.clean_text or unit.text for unit in units if (unit.clean_text or unit.text)
    ).strip()


def _is_hard_valid_gap(
    time: float,
    *,
    media_duration: float,
    min_chapter_duration: float,
) -> bool:
    """Return true when a gap can produce legal surrounding chapters."""
    return (
        time >= min_chapter_duration and media_duration - time >= min_chapter_duration
    )
