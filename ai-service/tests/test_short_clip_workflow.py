from app.schemas.short_clip import (
    ShortClipGenerationRequest,
    ShortClipPreferences,
    ShortClipTranscriptSegment,
)
from app.workflows.short_clip.schemas import (
    ClipCandidateProposal,
    ShortClipCandidateInput,
)
from app.workflows.short_clip.workflow import ShortClipWorkflow


def test_short_clip_workflow_uses_llm_candidates() -> None:
    workflow = ShortClipWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                ClipCandidateProposal(
                    start_segment_id="seg-1",
                    end_segment_id="seg-2",
                    title="Useful takeaway",
                    reason="Strong standalone idea.",
                    score=8.5,
                )
            ],
        )
    )

    result = workflow.execute(_request())

    assert result.source == "LLM"
    assert result.model == "fake-llm"
    assert result.candidates[0].title == "Useful takeaway"


def test_short_clip_workflow_falls_back_when_llm_provider_fails() -> None:
    workflow = ShortClipWorkflow(
        candidate_provider=_FailingProvider(),
        fallback_candidate_provider=_StaticProvider(
            source="NOOP",
            model_name="noop-short-clip-v1",
            proposals=[],
        ),
    )

    result = workflow.execute(_request())

    assert result.source == "NOOP"
    assert result.model == "noop-short-clip-v1"
    assert result.candidates == []


def test_short_clip_workflow_falls_back_when_repaired_llm_candidates_are_empty() -> (
    None
):
    workflow = ShortClipWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                ClipCandidateProposal(
                    start_segment_id="unknown",
                    end_segment_id="seg-2",
                    score=8.0,
                )
            ],
        ),
        fallback_candidate_provider=_StaticProvider(
            source="NOOP",
            model_name="noop-short-clip-v1",
            proposals=[],
        ),
    )

    result = workflow.execute(_request())

    assert result.source == "NOOP"
    assert result.candidates == []


def _request() -> ShortClipGenerationRequest:
    return ShortClipGenerationRequest(
        request_id="short-clip-workflow-test",
        language="en",
        media_duration_seconds=60,
        segments=[
            ShortClipTranscriptSegment(
                segment_id="seg-1",
                start_seconds=0,
                end_seconds=10,
                text="Set up the useful idea.",
            ),
            ShortClipTranscriptSegment(
                segment_id="seg-2",
                start_seconds=10,
                end_seconds=20,
                text="Deliver the practical takeaway.",
            ),
        ],
        preferences=ShortClipPreferences(
            clip_count=1,
            clip_length="15_30",
            min_duration_seconds=15,
            max_duration_seconds=30,
            aspect_ratio="9:16",
            language="ENGLISH",
            genre="TUTORIAL",
            clip_model="BALANCED",
            auto_hook=True,
            prompt="Prefer educational clips.",
            caption_preset_id="karaoke",
            burn_subtitle=True,
        ),
    )


class _StaticProvider:
    def __init__(
        self,
        *,
        source: str,
        model_name: str,
        proposals: list[ClipCandidateProposal],
    ) -> None:
        self._source = source
        self._model_name = model_name
        self._proposals = proposals

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def source(self) -> str:
        return self._source

    def generate_candidates(
        self,
        candidate_input: ShortClipCandidateInput,
    ) -> list[ClipCandidateProposal]:
        _ = candidate_input
        return self._proposals


class _FailingProvider:
    @property
    def model_name(self) -> str:
        return "fake-llm"

    @property
    def source(self) -> str:
        return "LLM"

    def generate_candidates(
        self,
        candidate_input: ShortClipCandidateInput,
    ) -> list[ClipCandidateProposal]:
        _ = candidate_input
        raise RuntimeError("provider failed")
