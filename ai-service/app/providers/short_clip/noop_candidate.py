from app.workflows.short_clip.schemas import (
    ClipCandidateProposal,
    ShortClipCandidateInput,
)


class NoopShortClipCandidateProvider:
    def __init__(self, *, model_name: str = "noop-short-clip-v1") -> None:
        self._model_name = model_name

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def source(self) -> str:
        return "NOOP"

    def generate_candidates(
        self,
        candidate_input: ShortClipCandidateInput,
    ) -> list[ClipCandidateProposal]:
        _ = candidate_input
        return []
