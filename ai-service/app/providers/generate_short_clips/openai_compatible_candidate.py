from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.provider_contracts.llm import JsonChatClientPort
from app.workflows.generate_short_clips.schemas import (
    GeneratedShortClipCandidateProposal,
    GenerateShortClipsCandidateInput,
)


class OpenAICompatibleGenerateShortClipsCandidateProvider:
    def __init__(self, *, chat_client: JsonChatClientPort) -> None:
        self._chat_client = chat_client

    @property
    def model_name(self) -> str:
        return self._chat_client.model_name

    @property
    def source(self) -> str:
        return "LLM"

    def generate_candidates(
        self,
        candidate_input: GenerateShortClipsCandidateInput,
    ) -> list[GeneratedShortClipCandidateProposal]:
        if not candidate_input.segments:
            return []

        response = self._chat_client.complete_json(
            system_prompt=_GENERATE_SHORT_CLIPS_SYSTEM_PROMPT,
            user_payload={
                "task": "generate_short_clips_candidate_generation",
                "language": candidate_input.language,
                "media_duration_seconds": candidate_input.media_duration_seconds,
                "preferences": candidate_input.preferences.model_dump(),
                "chapters": [
                    chapter.model_dump() for chapter in candidate_input.chapters
                ],
                "segments": [
                    segment.model_dump() for segment in candidate_input.segments
                ],
            },
        )
        try:
            parsed = _GenerateShortClipsResponse.model_validate(response)
        except ValidationError as exc:
            raise ValueError("Invalid short clip LLM response") from exc

        return [
            GeneratedShortClipCandidateProposal(
                start_segment_id=item.start_segment_id.strip(),
                end_segment_id=item.end_segment_id.strip(),
                title=item.title.strip() if item.title else None,
                reason=item.reason.strip() if item.reason else None,
                score=item.score,
            )
            for item in parsed.candidates
        ]


class _GenerateShortClipsItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start_segment_id: str = Field(min_length=1)
    end_segment_id: str = Field(min_length=1)
    title: str | None = Field(default=None, max_length=80)
    reason: str | None = Field(default=None, max_length=240)
    score: float | None = Field(default=None, ge=0.0, le=10.0)


class _GenerateShortClipsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidates: list[_GenerateShortClipsItem] = Field(default_factory=list)


_GENERATE_SHORT_CLIPS_SYSTEM_PROMPT = """
/no_think
You propose short-form video short clip candidates from transcript segments.
Return only valid JSON with this exact shape:
{"candidates":[{"start_segment_id":string,"end_segment_id":string,"title":string|null,"reason":string|null,"score":number|null}]}
Rules:
- Use only segment ids provided in the user payload.
- Do not invent timestamps or segment ids.
- Each candidate range must be coherent as a standalone clip.
- Prefer strong openings when auto_hook is true.
- score is 0 to 10.
"""
