from app.workflows.generate_chapters.schemas import (
    BoundaryEvaluation,
    BoundaryEvaluationInput,
)


class NoopChapterBoundaryEvaluationProvider:
    def evaluate_boundaries(
        self,
        inputs: list[BoundaryEvaluationInput],
    ) -> list[BoundaryEvaluation]:
        _ = inputs
        return []
