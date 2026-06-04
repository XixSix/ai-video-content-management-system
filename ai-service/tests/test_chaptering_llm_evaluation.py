from app.workflows.chaptering.llm_evaluation import apply_boundary_evaluations
from app.workflows.chaptering.schemas import (
    BoundaryEvaluation,
    BoundaryEvaluationInput,
    ChapterCandidate,
    ChapterContextWindow,
)


def test_valid_boundary_evaluation_updates_candidate_score_and_metadata() -> None:
    candidates, applied = apply_boundary_evaluations(
        [_candidate(20, score=0.2)],
        [_window(20)],
        provider=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=20,
                    is_chapter_boundary=True,
                    confidence=0.9,
                    transition_intent="CHANGE_TOPIC",
                    reason="New topic starts.",
                )
            ]
        ),
    )

    assert applied is True
    assert candidates[0].candidate_score == 0.41
    assert candidates[0].llm_confidence_score == 0.9
    assert candidates[0].llm_is_boundary is True
    assert candidates[0].transition_intent == "CHANGE_TOPIC"
    assert candidates[0].llm_reason == "New topic starts."


def test_unknown_candidate_time_rejects_all_evaluations() -> None:
    original = [_candidate(20, score=0.2)]

    candidates, applied = apply_boundary_evaluations(
        original,
        [_window(20)],
        provider=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=30,
                    is_chapter_boundary=True,
                    confidence=0.9,
                    transition_intent="CHANGE_TOPIC",
                    reason="Unknown candidate.",
                )
            ]
        ),
    )

    assert applied is False
    assert candidates == original


def test_duplicate_candidate_time_rejects_all_evaluations() -> None:
    original = [_candidate(20, score=0.2)]

    candidates, applied = apply_boundary_evaluations(
        original,
        [_window(20)],
        provider=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=20,
                    is_chapter_boundary=True,
                    confidence=0.9,
                    transition_intent="CHANGE_TOPIC",
                    reason="First.",
                ),
                BoundaryEvaluation(
                    candidate_time=20,
                    is_chapter_boundary=False,
                    confidence=0.4,
                    transition_intent="CONTINUE_TOPIC",
                    reason="Duplicate.",
                ),
            ]
        ),
    )

    assert applied is False
    assert candidates == original


def test_invalid_intent_rejects_all_evaluations() -> None:
    original = [_candidate(20, score=0.2)]

    candidates, applied = apply_boundary_evaluations(
        original,
        [_window(20)],
        provider=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=20,
                    is_chapter_boundary=True,
                    confidence=0.9,
                    transition_intent="INVALID_INTENT",
                    reason="Invalid.",
                )
            ]
        ),
    )

    assert applied is False
    assert candidates == original


def test_out_of_range_confidence_rejects_all_evaluations() -> None:
    original = [_candidate(20, score=0.2)]

    candidates, applied = apply_boundary_evaluations(
        original,
        [_window(20)],
        provider=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=20,
                    is_chapter_boundary=True,
                    confidence=1.2,
                    transition_intent="CHANGE_TOPIC",
                    reason="Invalid confidence.",
                )
            ]
        ),
    )

    assert applied is False
    assert candidates == original


def test_provider_failure_falls_back_to_original_candidates() -> None:
    original = [_candidate(20, score=0.2)]

    candidates, applied = apply_boundary_evaluations(
        original,
        [_window(20)],
        provider=_FailingBoundaryEvaluationProvider(),
    )

    assert applied is False
    assert candidates == original


def test_missing_evaluation_leaves_candidate_score_unchanged() -> None:
    candidates, applied = apply_boundary_evaluations(
        [_candidate(20, score=0.2), _candidate(40, score=0.7)],
        [_window(20), _window(40)],
        provider=_FakeBoundaryEvaluationProvider(
            [
                BoundaryEvaluation(
                    candidate_time=20,
                    is_chapter_boundary=True,
                    confidence=0.8,
                    transition_intent="CHANGE_TOPIC",
                    reason="Boundary.",
                )
            ]
        ),
    )

    assert applied is True
    assert candidates[0].candidate_score == 0.38
    assert candidates[1].candidate_score == 0.7


def _candidate(time: float, *, score: float) -> ChapterCandidate:
    return ChapterCandidate(
        time=time,
        unit_index=int(time),
        unit_id=f"unit_{int(time):04d}",
        previous_unit_ids=[f"unit_{int(time) - 1:04d}"],
        next_unit_ids=[f"unit_{int(time):04d}"],
        candidate_score=score,
    )


def _window(time: float) -> ChapterContextWindow:
    return ChapterContextWindow(
        candidate_time=time,
        left_text="left context",
        right_text="right context",
        left_unit_ids=["left"],
        right_unit_ids=["right"],
    )


class _FakeBoundaryEvaluationProvider:
    def __init__(self, evaluations: list[BoundaryEvaluation]) -> None:
        self.inputs: list[BoundaryEvaluationInput] = []
        self._evaluations = evaluations

    def evaluate_boundaries(
        self,
        inputs: list[BoundaryEvaluationInput],
    ) -> list[BoundaryEvaluation]:
        self.inputs = inputs
        return self._evaluations


class _FailingBoundaryEvaluationProvider:
    def evaluate_boundaries(
        self,
        inputs: list[BoundaryEvaluationInput],
    ) -> list[BoundaryEvaluation]:
        _ = inputs
        raise RuntimeError("provider failed")
