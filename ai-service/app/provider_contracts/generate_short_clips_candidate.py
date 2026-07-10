from typing import Protocol

from app.workflows.generate_short_clips.schemas import (
    GeneratedShortClipCandidateProposal,
    GenerateShortClipsCandidateInput,
)


class GenerateShortClipsCandidateProviderPort(Protocol):
    @property
    def model_name(self) -> str: ...

    @property
    def source(self) -> str: ...

    def generate_candidates(
        self,
        candidate_input: GenerateShortClipsCandidateInput,
    ) -> list[GeneratedShortClipCandidateProposal]: ...
