from app.schemas.generate_short_clips import (
    GenerateShortClipsRequest,
    GenerateShortClipsPreferences,
    GenerateShortClipsTranscriptSegment,
)
from app.workflows.generate_short_clips.schemas import (
    GeneratedShortClipCandidateProposal,
    GenerateShortClipsCandidateInput,
)
from app.workflows.generate_short_clips.workflow import GenerateShortClipsWorkflow


def test_generate_short_clips_workflow_uses_llm_candidates() -> None:
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                GeneratedShortClipCandidateProposal(
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


def test_generate_short_clips_workflow_falls_back_when_llm_provider_fails() -> None:
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=_FailingProvider(),
        fallback_candidate_provider=_StaticProvider(
            source="NOOP",
            model_name="noop-generate-short-clips-v1",
            proposals=[],
        ),
    )

    result = workflow.execute(_request())

    assert result.source == "NOOP"
    assert result.model == "noop-generate-short-clips-v1"
    assert result.candidates == []


def test_generate_short_clips_workflow_falls_back_when_repaired_llm_candidates_are_empty() -> (
    None
):
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                GeneratedShortClipCandidateProposal(
                    start_segment_id="unknown",
                    end_segment_id="seg-2",
                    score=8.0,
                )
            ],
        ),
        fallback_candidate_provider=_StaticProvider(
            source="NOOP",
            model_name="noop-generate-short-clips-v1",
            proposals=[],
        ),
    )

    result = workflow.execute(_request())

    assert result.source == "NOOP"
    assert result.candidates == []


def test_generate_short_clips_workflow_ranks_candidates_before_clipping() -> None:
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                GeneratedShortClipCandidateProposal(
                    start_segment_id="seg-1",
                    end_segment_id="seg-2",
                    title="Lower score",
                    score=4.0,
                ),
                GeneratedShortClipCandidateProposal(
                    start_segment_id="seg-2",
                    end_segment_id="seg-3",
                    title="Higher score",
                    score=9.0,
                ),
            ],
        )
    )

    result = workflow.execute(_request(clip_count=1))

    assert [candidate.title for candidate in result.candidates] == ["Higher score"]


def test_generate_short_clips_workflow_uses_timestamp_tiebreak_for_equal_scores() -> (
    None
):
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                GeneratedShortClipCandidateProposal(
                    start_segment_id="seg-2",
                    end_segment_id="seg-3",
                    title="Later candidate",
                    score=8.0,
                ),
                GeneratedShortClipCandidateProposal(
                    start_segment_id="seg-1",
                    end_segment_id="seg-2",
                    title="Earlier candidate",
                    score=8.0,
                ),
            ],
        )
    )

    result = workflow.execute(_request(clip_count=2))

    assert [candidate.title for candidate in result.candidates] == [
        "Earlier candidate",
        "Later candidate",
    ]


def test_generate_short_clips_workflow_drops_invalid_high_score_before_ranking() -> (
    None
):
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                GeneratedShortClipCandidateProposal(
                    start_segment_id="unknown",
                    end_segment_id="seg-2",
                    title="Invalid high score",
                    score=10.0,
                ),
                GeneratedShortClipCandidateProposal(
                    start_segment_id="seg-1",
                    end_segment_id="seg-2",
                    title="Valid lower score",
                    score=7.0,
                ),
            ],
        )
    )

    result = workflow.execute(_request(clip_count=1))

    assert [candidate.title for candidate in result.candidates] == ["Valid lower score"]


def test_generate_short_clips_workflow_deduplicates_exact_ranges_before_ranking() -> (
    None
):
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=_StaticProvider(
            source="LLM",
            model_name="fake-llm",
            proposals=[
                GeneratedShortClipCandidateProposal(
                    start_segment_id="seg-1",
                    end_segment_id="seg-2",
                    title="First range",
                    score=5.0,
                ),
                GeneratedShortClipCandidateProposal(
                    start_segment_id="seg-1",
                    end_segment_id="seg-2",
                    title="Duplicate range",
                    score=10.0,
                ),
            ],
        )
    )

    result = workflow.execute(_request(clip_count=2))

    assert [candidate.title for candidate in result.candidates] == ["First range"]


def _request(*, clip_count: int = 1) -> GenerateShortClipsRequest:
    return GenerateShortClipsRequest(
        request_id="generate-short-clips-workflow-test",
        language="en",
        media_duration_seconds=60,
        segments=[
            GenerateShortClipsTranscriptSegment(
                segment_id="seg-1",
                start_seconds=0,
                end_seconds=10,
                text="Set up the useful idea.",
            ),
            GenerateShortClipsTranscriptSegment(
                segment_id="seg-2",
                start_seconds=10,
                end_seconds=20,
                text="Deliver the practical takeaway.",
            ),
            GenerateShortClipsTranscriptSegment(
                segment_id="seg-3",
                start_seconds=20,
                end_seconds=30,
                text="Close with a concrete next action.",
            ),
        ],
        preferences=GenerateShortClipsPreferences(
            clip_count=clip_count,
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
        proposals: list[GeneratedShortClipCandidateProposal],
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
        candidate_input: GenerateShortClipsCandidateInput,
    ) -> list[GeneratedShortClipCandidateProposal]:
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
        candidate_input: GenerateShortClipsCandidateInput,
    ) -> list[GeneratedShortClipCandidateProposal]:
        _ = candidate_input
        raise RuntimeError("provider failed")
