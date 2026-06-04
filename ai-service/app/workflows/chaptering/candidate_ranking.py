import math
from dataclasses import replace

from app.workflows.chaptering.scores.common import clamp_score
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    ChapterCandidate,
)


def rank_boundary_candidates(
    candidates: list[ChapterCandidate],
    *,
    semantic_shift_scores_by_time: dict[float, float],
    max_chapters: int,
    min_candidate_distance_seconds: float,
    config: CandidateRetentionConfig,
) -> list[ChapterCandidate]:
    """Score, dedupe, and retain final deterministic boundary candidates.

    The ranking step folds optional semantic shift into retained candidates,
    computes the Phase 5 candidate score, suppresses nearby duplicate boundary
    times, and keeps both high-scoring and timeline-coverage candidates.
    """
    if not candidates:
        return []

    scored_candidates = [
        _score_candidate(candidate, semantic_shift_scores_by_time)
        for candidate in candidates
    ]
    deduped_candidates = _suppress_nearby_candidates(
        scored_candidates,
        min_candidate_distance_seconds=min_candidate_distance_seconds,
    )
    retained_candidates = _retain_ranked_candidates(
        deduped_candidates,
        max_chapters=max_chapters,
        config=config,
    )

    return sorted(retained_candidates, key=lambda candidate: candidate.time)


def _score_candidate(
    candidate: ChapterCandidate,
    semantic_shift_scores_by_time: dict[float, float],
) -> ChapterCandidate:
    semantic_shift_score = clamp_score(
        semantic_shift_scores_by_time.get(candidate.time, 0.0)
    )
    candidate_score = (
        0.35 * candidate.valley_depth_score
        + 0.30 * semantic_shift_score
        + 0.15 * candidate.lexical_shift_score
        + 0.10 * candidate.discourse_marker_score
        + 0.05 * candidate.pause_score
        + 0.05 * candidate.duration_sanity_score
    )

    return replace(
        candidate,
        semantic_shift_score=round(semantic_shift_score, 4),
        candidate_score=round(clamp_score(candidate_score), 4),
    )


def _suppress_nearby_candidates(
    candidates: list[ChapterCandidate],
    *,
    min_candidate_distance_seconds: float,
) -> list[ChapterCandidate]:
    """Keep the strongest candidate from each nearby boundary cluster."""
    if min_candidate_distance_seconds <= 0:
        return sorted(candidates, key=lambda candidate: candidate.time)

    selected: list[ChapterCandidate] = []
    for candidate in sorted(
        candidates,
        key=lambda item: (-item.candidate_score, item.time),
    ):
        if any(
            abs(candidate.time - selected_candidate.time)
            < min_candidate_distance_seconds
            for selected_candidate in selected
        ):
            continue

        selected.append(candidate)

    return sorted(selected, key=lambda candidate: candidate.time)


def _retain_ranked_candidates(
    candidates: list[ChapterCandidate],
    *,
    max_chapters: int,
    config: CandidateRetentionConfig,
) -> list[ChapterCandidate]:
    """Preserve top final-score candidates plus broad timeline coverage."""
    if not candidates:
        return []

    limit = _candidate_limit(max_chapters=max_chapters, config=config)
    if len(candidates) <= limit:
        return candidates

    top_limit = max(1, math.ceil(limit * config.top_score_fraction))
    selected_by_time = {
        candidate.time: candidate
        for candidate in sorted(
            candidates,
            key=lambda item: (-item.candidate_score, item.time),
        )[:top_limit]
    }

    for candidate in _downsample_evenly(candidates, limit - len(selected_by_time)):
        selected_by_time.setdefault(candidate.time, candidate)

    if len(selected_by_time) < limit:
        for candidate in sorted(
            candidates,
            key=lambda item: (-item.candidate_score, item.time),
        ):
            selected_by_time.setdefault(candidate.time, candidate)
            if len(selected_by_time) >= limit:
                break

    return sorted(selected_by_time.values(), key=lambda candidate: candidate.time)


def _candidate_limit(
    *,
    max_chapters: int,
    config: CandidateRetentionConfig,
) -> int:
    estimated_limit = max(1, max_chapters) * config.multiplier
    return max(config.min_limit, min(estimated_limit, config.max_limit))


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
