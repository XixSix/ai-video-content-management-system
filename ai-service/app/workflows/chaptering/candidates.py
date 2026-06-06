import logging
import math
from collections.abc import Iterable
from dataclasses import replace

from app.workflows.chaptering.scores.common import clamp_score
from app.workflows.chaptering.scores.lexical import (
    lexical_shift_score as calculate_lexical_shift_score,
)
from app.workflows.chaptering.scores.quality import (
    boundary_quality_score as calculate_boundary_quality_score,
)
from app.workflows.chaptering.scores.temporal import (
    duration_sanity_score as calculate_duration_sanity_score,
    pause_score as calculate_pause_score,
)
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapterCandidate,
    ChapterUnit,
)
from app.workflows.chaptering.scores.transition_markers import transition_marker_score

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


def retain_candidates_for_boundary_review(
    candidates: list[ChapterCandidate],
    *,
    media_duration: float,
    target_chapter_duration: float,
    config: CandidateRetentionConfig,
) -> list[ChapterCandidate]:
    """Keep a bounded candidate set for ranking and optional LLM review.

    Retention keeps top valley-score candidates once valley detection has
    produced candidates, falls back to cheap score otherwise, and fills the
    remaining budget with evenly distributed coverage candidates.
    """
    if not candidates:
        return []

    limit = _boundary_review_candidate_limit(
        media_duration=media_duration,
        target_chapter_duration=target_chapter_duration,
        config=config,
    )
    if len(candidates) <= limit:
        return candidates

    use_valley_score = any(candidate.valley_depth_score > 0 for candidate in candidates)
    top_limit = max(1, math.ceil(limit * config.top_score_fraction))
    selected_by_time = {
        candidate.time: candidate
        for candidate in sorted(
            candidates,
            key=lambda candidate: (
                -_retention_score(candidate, use_valley_score=use_valley_score),
                candidate.time,
            ),
        )[:top_limit]
    }

    for candidate in _downsample_evenly(candidates, limit - len(selected_by_time)):
        selected_by_time.setdefault(candidate.time, candidate)

    if len(selected_by_time) < limit:
        for candidate in sorted(
            candidates,
            key=lambda candidate: (
                -_retention_score(candidate, use_valley_score=use_valley_score),
                candidate.time,
            ),
        ):
            selected_by_time.setdefault(candidate.time, candidate)
            if len(selected_by_time) >= limit:
                break

    return sorted(selected_by_time.values(), key=lambda candidate: candidate.time)


def _retention_score(
    candidate: ChapterCandidate,
    *,
    use_valley_score: bool,
) -> float:
    """Return the score used to retain candidates before boundary review."""
    return candidate.valley_depth_score if use_valley_score else candidate.cheap_score


def _candidate_from_unit(
    units: list[ChapterUnit],
    unit_index: int,
) -> ChapterCandidate:
    unit = units[unit_index]
    return ChapterCandidate(
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
        + config.lexical_shift_weight * lexical_shift_score
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


def _boundary_review_candidate_limit(
    *,
    media_duration: float,
    target_chapter_duration: float,
    config: CandidateRetentionConfig,
) -> int:
    if media_duration <= 0 or target_chapter_duration <= 0:
        return config.min_limit

    estimated_chapter_count = max(
        1, math.ceil(media_duration / target_chapter_duration)
    )
    return max(
        config.min_limit,
        min(
            estimated_chapter_count * config.multiplier,
            config.max_limit,
        ),
    )


def _downsample_evenly(
    candidates: list[ChapterCandidate],
    max_candidates: int,
) -> list[ChapterCandidate]:
    """Keep candidates spread across the full timeline when density is high."""
    if max_candidates <= 0:
        return []

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
