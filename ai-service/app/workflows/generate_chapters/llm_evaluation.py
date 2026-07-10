from dataclasses import replace
from logging import getLogger

from app.provider_contracts.generate_chapters_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.workflows.generate_chapters.schemas import (
    ALLOWED_TRANSITION_INTENTS,
    BoundaryEvaluation,
    BoundaryEvaluationInput,
    ChapterCandidate,
    ChapterContextWindow,
)

logger = getLogger(__name__)


def apply_boundary_evaluations(
    candidates: list[ChapterCandidate],
    windows: list[ChapterContextWindow],
    *,
    provider: ChapterBoundaryEvaluationPort,
) -> tuple[list[ChapterCandidate], bool]:
    """Attach optional LLM boundary judgments to prepared candidates.

    The provider can only evaluate candidate times already produced by code.
    Any provider exception or invalid evaluation set returns the original
    candidates so deterministic generate_chapters remains the fallback path.

    Returns:
        A tuple of `(candidates, applied)` where `applied` is true only when at
        least one valid evaluation was attached to a candidate.
    """
    inputs = build_boundary_evaluation_inputs(candidates, windows)
    if not inputs:
        return candidates, False

    try:
        evaluations = provider.evaluate_boundaries(inputs)
    except Exception:
        logger.exception("LLM boundary evaluation provider failed")
        return candidates, False

    if not evaluations:
        return candidates, False

    if not _evaluations_are_valid(evaluations, candidates):
        logger.warning("Ignoring invalid LLM boundary evaluations")
        return candidates, False

    evaluations_by_time = {
        evaluation.candidate_time: evaluation for evaluation in evaluations
    }
    applied = False
    evaluated_candidates: list[ChapterCandidate] = []
    for candidate in candidates:
        evaluation = evaluations_by_time.get(candidate.time)
        if evaluation is None:
            evaluated_candidates.append(candidate)
            continue

        applied = True
        evaluated_candidates.append(_apply_evaluation(candidate, evaluation))

    return evaluated_candidates, applied


def build_boundary_evaluation_inputs(
    candidates: list[ChapterCandidate],
    windows: list[ChapterContextWindow],
) -> list[BoundaryEvaluationInput]:
    """Build provider inputs for candidates with bidirectional context."""
    candidates_by_time = {candidate.time: candidate for candidate in candidates}
    inputs: list[BoundaryEvaluationInput] = []

    for window in windows:
        candidate = candidates_by_time.get(window.candidate_time)
        if candidate is None:
            continue

        inputs.append(
            BoundaryEvaluationInput(
                candidate_time=candidate.time,
                left_context=window.left_text,
                right_context=window.right_text,
                candidate_score=candidate.candidate_score,
                lexical_shift_score=candidate.lexical_shift_score,
                semantic_shift_score=candidate.semantic_shift_score,
                valley_depth_score=candidate.valley_depth_score,
                pause_score=candidate.pause_score,
                discourse_marker_score=candidate.discourse_marker_score,
            )
        )

    return inputs


def _evaluations_are_valid(
    evaluations: list[BoundaryEvaluation],
    candidates: list[ChapterCandidate],
) -> bool:
    """Return true only when every evaluation is known and well-formed."""
    candidate_times = {candidate.time for candidate in candidates}
    seen_times: set[float] = set()

    for evaluation in evaluations:
        if evaluation.candidate_time not in candidate_times:
            return False

        if evaluation.candidate_time in seen_times:
            return False
        seen_times.add(evaluation.candidate_time)

        if not 0.0 <= evaluation.confidence <= 1.0:
            return False

        if evaluation.transition_intent not in ALLOWED_TRANSITION_INTENTS:
            return False

    return True


def _apply_evaluation(
    candidate: ChapterCandidate,
    evaluation: BoundaryEvaluation,
) -> ChapterCandidate:
    """Return a candidate with LLM metadata attached."""
    return replace(
        candidate,
        llm_confidence_score=round(evaluation.confidence, 4),
        llm_is_boundary=evaluation.is_chapter_boundary,
        transition_intent=evaluation.transition_intent,
        llm_reason=evaluation.reason,
    )
