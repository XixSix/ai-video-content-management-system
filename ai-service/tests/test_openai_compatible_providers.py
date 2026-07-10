import pytest

from app.providers.generate_chapters.openai_compatible_boundary_evaluation import (
    OpenAICompatibleChapterBoundaryEvaluationProvider,
)
from app.providers.generate_chapters.openai_compatible_title import (
    OpenAICompatibleChapterTitleProvider,
)
from app.providers.generate_short_clips.openai_compatible_candidate import (
    OpenAICompatibleGenerateShortClipsCandidateProvider,
)
from app.schemas.generate_short_clips import (
    GenerateShortClipsPreferences,
    GenerateShortClipsTranscriptSegment,
)
from app.workflows.generate_chapters.schemas import (
    BoundaryEvaluationInput,
    ChapterTitleInput,
)
from app.workflows.generate_short_clips.schemas import GenerateShortClipsCandidateInput


def test_boundary_provider_maps_json_response() -> None:
    client = _FakeChatClient(
        {
            "evaluations": [
                {
                    "candidate_time": 12.0,
                    "is_chapter_boundary": True,
                    "confidence": 0.82,
                    "transition_intent": "CHANGE_TOPIC",
                    "reason": "The right side starts a new topic.",
                }
            ]
        }
    )
    provider = OpenAICompatibleChapterBoundaryEvaluationProvider(chat_client=client)

    evaluations = provider.evaluate_boundaries([_boundary_input()])

    assert evaluations[0].candidate_time == 12.0
    assert evaluations[0].is_chapter_boundary is True
    assert evaluations[0].transition_intent == "CHANGE_TOPIC"
    assert client.user_payload["task"] == "chapter_boundary_evaluation"


def test_boundary_provider_rejects_invalid_response_shape() -> None:
    provider = OpenAICompatibleChapterBoundaryEvaluationProvider(
        chat_client=_FakeChatClient({"evaluations": [{"candidate_time": 12.0}]})
    )

    with pytest.raises(ValueError):
        provider.evaluate_boundaries([_boundary_input()])


def test_boundary_provider_ignores_unusable_local_llm_wrapper() -> None:
    provider = OpenAICompatibleChapterBoundaryEvaluationProvider(
        chat_client=_FakeChatClient(
            {
                "version": "1.0",
                "label": "chapter_boundary_evaluation",
                "data": {"text": "The model summarized the conversation instead."},
            }
        )
    )

    assert provider.evaluate_boundaries([_boundary_input()]) == []


def test_title_provider_maps_json_response() -> None:
    client = _FakeChatClient(
        {
            "chapters": [
                {
                    "chapter_index": 0,
                    "title": " Upload Flow ",
                    "summary": " Validate uploaded source media. ",
                }
            ]
        }
    )
    provider = OpenAICompatibleChapterTitleProvider(chat_client=client)

    titles = provider.generate_titles([_title_input()])

    assert titles[0].chapter_index == 0
    assert titles[0].title == "Upload Flow"
    assert titles[0].summary == "Validate uploaded source media."
    assert client.user_payload["task"] == "chapter_title_generation"


def test_title_provider_truncates_overlong_title_and_summary() -> None:
    client = _FakeChatClient(
        {
            "chapters": [
                {
                    "chapter_index": 0,
                    "title": "A" * 120,
                    "summary": "B" * 320,
                }
            ]
        }
    )
    provider = OpenAICompatibleChapterTitleProvider(chat_client=client)

    titles = provider.generate_titles([_title_input()])

    assert len(titles[0].title) == 80
    assert titles[0].title.endswith("...")
    assert len(titles[0].summary or "") == 240
    assert (titles[0].summary or "").endswith("...")


def test_title_provider_repairs_single_title_response() -> None:
    provider = OpenAICompatibleChapterTitleProvider(
        chat_client=_FakeChatClient(
            {
                "title": "Childhood Memories",
                "description": "A discussion about games and parenting styles.",
                "keywords": "childhood, games",
            }
        )
    )

    titles = provider.generate_titles([_title_input()])

    assert titles[0].chapter_index == 0
    assert titles[0].title == "Childhood Memories"
    assert titles[0].summary == "A discussion about games and parenting styles."


def test_generate_short_clips_provider_maps_json_response() -> None:
    client = _FakeChatClient(
        {
            "candidates": [
                {
                    "start_segment_id": " seg-1 ",
                    "end_segment_id": " seg-2 ",
                    "title": " Strong opening ",
                    "reason": " Clear hook. ",
                    "score": 8.5,
                }
            ]
        }
    )
    provider = OpenAICompatibleGenerateShortClipsCandidateProvider(chat_client=client)

    proposals = provider.generate_candidates(_generate_short_clips_input())

    assert proposals[0].start_segment_id == "seg-1"
    assert proposals[0].end_segment_id == "seg-2"
    assert proposals[0].title == "Strong opening"
    assert proposals[0].score == 8.5
    assert provider.model_name == "fake-llm"
    assert provider.source == "LLM"
    assert client.user_payload["task"] == "generate_short_clips_candidate_generation"


def test_generate_short_clips_provider_rejects_invalid_response_shape() -> None:
    provider = OpenAICompatibleGenerateShortClipsCandidateProvider(
        chat_client=_FakeChatClient({"candidates": [{"start_segment_id": "seg-1"}]})
    )

    with pytest.raises(ValueError):
        provider.generate_candidates(_generate_short_clips_input())


def _boundary_input() -> BoundaryEvaluationInput:
    return BoundaryEvaluationInput(
        candidate_time=12.0,
        left_context="Existing topic context.",
        right_context="New topic context.",
        candidate_score=0.7,
        lexical_shift_score=0.5,
        semantic_shift_score=0.6,
        valley_depth_score=0.4,
        pause_score=0.3,
        discourse_marker_score=0.2,
    )


def _title_input() -> ChapterTitleInput:
    return ChapterTitleInput(
        chapter_index=0,
        start_time=0,
        end_time=30,
        language="en",
        text="Upload media and validate files.",
    )


def _generate_short_clips_input() -> GenerateShortClipsCandidateInput:
    return GenerateShortClipsCandidateInput(
        language="en",
        media_duration_seconds=60,
        segments=[
            GenerateShortClipsTranscriptSegment(
                segment_id="seg-1",
                start_seconds=0,
                end_seconds=10,
                text="Set up the key idea.",
            ),
            GenerateShortClipsTranscriptSegment(
                segment_id="seg-2",
                start_seconds=10,
                end_seconds=20,
                text="Deliver the useful takeaway.",
            ),
        ],
        preferences=GenerateShortClipsPreferences(
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


class _FakeChatClient:
    def __init__(self, response: object) -> None:
        self._response = response
        self.system_prompt = ""
        self.user_payload: dict[str, object] = {}

    @property
    def model_name(self) -> str:
        return "fake-llm"

    def complete_json(
        self,
        *,
        system_prompt: str,
        user_payload: dict[str, object],
    ) -> object:
        self.system_prompt = system_prompt
        self.user_payload = user_payload
        return self._response
