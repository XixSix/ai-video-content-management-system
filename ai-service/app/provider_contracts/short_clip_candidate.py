from typing import Protocol

from app.workflows.short_clip.schemas import (
    ClipCandidateProposal,
    ShortClipCandidateInput,
)


class ShortClipCandidateProviderPort(Protocol):
    @property
    def model_name(self) -> str: ...

    @property
    def source(self) -> str: ...

    def generate_candidates(
        self,
        candidate_input: ShortClipCandidateInput,
    ) -> list[ClipCandidateProposal]: ...
