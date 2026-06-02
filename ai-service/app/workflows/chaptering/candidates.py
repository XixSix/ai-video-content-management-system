import logging
import math
import re
from collections.abc import Iterable
from dataclasses import replace

from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapterBoundaryCandidate,
    ChapterUnit,
)
from app.workflows.chaptering.transition_markers import transition_marker_score

logger = logging.getLogger(__name__)

TOKEN_RE = re.compile(r"[a-z0-9']+")


def generate_boundary_candidates(
    units: list[ChapterUnit],
    *,
    media_duration: float,
    min_chapter_duration: float,
) -> list[ChapterBoundaryCandidate]:
    """Create candidate chapter starts from real unit boundaries.

    The generator only rejects boundaries that would violate hard duration
    constraints. It does not downsample or select final chapters.
    """
    if len(units) < 2 or media_duration <= 0:
        return []

    candidates: list[ChapterBoundaryCandidate] = []
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
    candidates: list[ChapterBoundaryCandidate],
    *,
    media_duration: float,
    min_chapter_duration: float,
    config: CandidateScoringConfig,
) -> list[ChapterBoundaryCandidate]:
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


def retain_candidates_for_embedding(
    candidates: list[ChapterBoundaryCandidate],
    *,
    media_duration: float,
    target_chapter_duration: float,
    config: CandidateRetentionConfig,
) -> list[ChapterBoundaryCandidate]:
    """Keep a bounded candidate set for embedding and final selection.

    Retention keeps top cheap-score candidates and fills the remaining budget
    with evenly distributed coverage candidates.
    """
    if not candidates:
        return []

    limit = _embedding_candidate_limit(
        media_duration=media_duration,
        target_chapter_duration=target_chapter_duration,
        config=config,
    )
    if len(candidates) <= limit:
        return candidates

    top_limit = max(1, math.ceil(limit * config.top_score_fraction))
    selected_by_time = {
        candidate.time: candidate
        for candidate in sorted(
            candidates,
            key=lambda candidate: (-candidate.cheap_score, candidate.time),
        )[:top_limit]
    }

    for candidate in _downsample_evenly(candidates, limit - len(selected_by_time)):
        selected_by_time.setdefault(candidate.time, candidate)

    if len(selected_by_time) < limit:
        for candidate in sorted(
            candidates,
            key=lambda candidate: (-candidate.cheap_score, candidate.time),
        ):
            selected_by_time.setdefault(candidate.time, candidate)
            if len(selected_by_time) >= limit:
                break

    return sorted(selected_by_time.values(), key=lambda candidate: candidate.time)


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


def _score_candidate(
    units: list[ChapterUnit],
    candidate: ChapterBoundaryCandidate,
    *,
    media_duration: float,
    min_chapter_duration: float,
    config: CandidateScoringConfig,
) -> ChapterBoundaryCandidate:
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
    pause_score = _pause_score(
        current_unit.start_time - previous_unit.end_time,
        long_pause_seconds=config.long_pause_seconds,
        max_pause_score_seconds=config.max_pause_score_seconds,
    )
    lexical_shift_score = _lexical_shift_score(left_text, right_text)
    boundary_quality_score = _boundary_quality_score(
        left_text,
        right_text,
        min_context_text_chars=config.min_context_text_chars,
    )
    duration_sanity_score = _duration_sanity_score(
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
        cheap_score=round(_clamp(cheap_score), 4),
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


def _pause_score(
    pause_seconds: float,
    *,
    long_pause_seconds: float,
    max_pause_score_seconds: float,
) -> float:
    if pause_seconds < long_pause_seconds:
        return 0.0

    return _clamp(pause_seconds / max_pause_score_seconds)


def _lexical_shift_score(left_text: str, right_text: str) -> float:
    """Return cheap lexical shift using Jaccard distance over token sets."""
    left_tokens = set(TOKEN_RE.findall(left_text.lower()))
    right_tokens = set(TOKEN_RE.findall(right_text.lower()))
    if not left_tokens or not right_tokens:
        return 0.0

    overlap = len(left_tokens & right_tokens)
    union = len(left_tokens | right_tokens)
    return _clamp(1.0 - overlap / union)


def _boundary_quality_score(
    left_text: str,
    right_text: str,
    *,
    min_context_text_chars: int,
) -> float:
    if min_context_text_chars <= 0:
        return 0.0

    return _clamp(min(len(left_text), len(right_text)) / min_context_text_chars)


def _duration_sanity_score(
    time: float,
    *,
    media_duration: float,
    min_chapter_duration: float,
) -> float:
    if min_chapter_duration <= 0:
        return 0.0

    available_margin = min(time, media_duration - time)
    return _clamp(available_margin / (min_chapter_duration * 2))


def _embedding_candidate_limit(
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
    candidates: list[ChapterBoundaryCandidate],
    max_candidates: int,
) -> list[ChapterBoundaryCandidate]:
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


def _clamp(value: float) -> float:
    return max(0.0, min(value, 1.0))
