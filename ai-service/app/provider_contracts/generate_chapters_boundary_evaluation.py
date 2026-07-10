from typing import Protocol

from app.workflows.generate_chapters.schemas import (
    BoundaryEvaluation,
    BoundaryEvaluationInput,
)


class ChapterBoundaryEvaluationPort(Protocol):
    def evaluate_boundaries(
        self,
        inputs: list[BoundaryEvaluationInput],
    ) -> list[BoundaryEvaluation]: ...
