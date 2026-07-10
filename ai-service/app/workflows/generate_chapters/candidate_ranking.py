import math
from dataclasses import replace

from app.workflows.generate_chapters.scores.common import clamp_score
from app.workflows.generate_chapters.schemas import (
    CandidateRetentionConfig,
    ChapterCandidate,
)

LLM_ALGORITHM_WEIGHT = 0.70
LLM_CONFIDENCE_WEIGHT = 0.30
SEMANTIC_VALLEY_WEIGHT = 0.70
LEXICAL_SHIFT_WEIGHT = 0.30
CANDIDATE_SEMANTIC_WEIGHT = 0.70
CANDIDATE_GAP_WEIGHT = 0.30


def prepare_boundary_candidates_for_review(
    candidates: list[ChapterCandidate],
    *,
    max_chapters: int,
    min_candidate_distance_seconds: float,
    config: CandidateRetentionConfig,
) -> list[ChapterCandidate]:
    """Prepare a bounded candidate set for optional LLM boundary review.

    This pre-review step computes the deterministic candidate score, suppresses
    nearby duplicate boundary times, then keeps top-scoring and timeline
    coverage candidates. It does not apply LLM judgments or select final
    chapter boundaries.
    """
    if not candidates:
        return []

    scored_candidates = [_score_candidate(candidate) for candidate in candidates]
    deduped_candidates = _suppress_nearby_candidates(
        scored_candidates,
        min_candidate_distance_seconds=min_candidate_distance_seconds,
    )
    retained_candidates = _retain_prepared_candidates(
        deduped_candidates,
        max_chapters=max_chapters,
        config=config,
    )

    return sorted(retained_candidates, key=lambda candidate: candidate.time)


def _score_candidate(candidate: ChapterCandidate) -> ChapterCandidate:
    semantic_score = _semantic_score(candidate)
    candidate_score = (
        CANDIDATE_SEMANTIC_WEIGHT * semantic_score
        + CANDIDATE_GAP_WEIGHT * candidate.cheap_score
    )

    return replace(
        candidate,
        candidate_score=round(clamp_score(candidate_score), 4),
    )


def _semantic_score(candidate: ChapterCandidate) -> float:
    return clamp_score(
        SEMANTIC_VALLEY_WEIGHT * candidate.semantic_valley_depth_score
        + LEXICAL_SHIFT_WEIGHT * candidate.lexical_shift_score
    )


def rank_final_boundary_candidates(
    candidates: list[ChapterCandidate],
) -> list[ChapterCandidate]:
    """Overwrite candidate scores with final post-LLM selection scores.

    Before this function, `candidate_score` is the deterministic pre-review
    score. After this function, `candidate_score` is the final advisory score
    consumed by boundary selection. Candidates without LLM judgments keep their
    deterministic score.
    """
    return sorted(
        [_with_final_candidate_score(candidate) for candidate in candidates],
        key=lambda candidate: candidate.time,
    )


def _with_final_candidate_score(candidate: ChapterCandidate) -> ChapterCandidate:
    if candidate.llm_is_boundary is True:
        score = (
            LLM_ALGORITHM_WEIGHT * candidate.candidate_score
            + LLM_CONFIDENCE_WEIGHT * candidate.llm_confidence_score
        )
    elif candidate.llm_is_boundary is False:
        score = (
            LLM_ALGORITHM_WEIGHT * candidate.candidate_score
            - LLM_CONFIDENCE_WEIGHT * candidate.llm_confidence_score
        )
    else:
        score = candidate.candidate_score

    return replace(candidate, candidate_score=round(clamp_score(score), 4))


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


def _retain_prepared_candidates(
    candidates: list[ChapterCandidate],
    *,
    max_chapters: int,
    config: CandidateRetentionConfig,
) -> list[ChapterCandidate]:
    """Preserve top pre-review candidates plus broad timeline coverage."""
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
