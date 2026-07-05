from typing import cast

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.provider_contracts.llm import JsonChatClientPort
from app.workflows.chaptering.schemas import (
    BoundaryEvaluation,
    BoundaryEvaluationInput,
    TransitionIntent,
)


class OpenAICompatibleChapterBoundaryEvaluationProvider:
    def __init__(self, *, chat_client: JsonChatClientPort) -> None:
        self._chat_client = chat_client

    def evaluate_boundaries(
        self,
        inputs: list[BoundaryEvaluationInput],
    ) -> list[BoundaryEvaluation]:
        if not inputs:
            return []

        response = self._chat_client.complete_json(
            system_prompt=_BOUNDARY_SYSTEM_PROMPT,
            user_payload={
                "task": "chapter_boundary_evaluation",
                "required_response_schema": {
                    "evaluations": [
                        {
                            "candidate_time": "number from candidates",
                            "is_chapter_boundary": "boolean",
                            "confidence": "number 0..1",
                            "transition_intent": "one allowed intent",
                            "reason": "short string",
                        }
                    ]
                },
                "allowed_transition_intents": [
                    "CONTINUE_TOPIC",
                    "DEVELOP_SUBTOPIC",
                    "INTRODUCE_RELATED_TOPIC",
                    "CHANGE_TOPIC",
                    "START_NEW_STEP",
                    "EXAMPLE_OR_DIGRESSION",
                    "RECAP_OR_CONCLUSION",
                    "RETURN_TO_MAIN_TOPIC",
                ],
                "candidates": [_boundary_input_payload(item) for item in inputs],
            },
        )
        parsed = _parse_boundary_response(response)

        return [
            BoundaryEvaluation(
                candidate_time=item.candidate_time,
                is_chapter_boundary=item.is_chapter_boundary,
                confidence=item.confidence,
                transition_intent=cast(TransitionIntent, item.transition_intent),
                reason=item.reason.strip(),
            )
            for item in parsed.evaluations
        ]


class _BoundaryItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_time: float
    is_chapter_boundary: bool
    confidence: float = Field(ge=0.0, le=1.0)
    transition_intent: str
    reason: str = Field(min_length=1)


class _BoundaryResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evaluations: list[_BoundaryItem] = Field(default_factory=list)


def _parse_boundary_response(response: object) -> _BoundaryResponse:
    try:
        return _BoundaryResponse.model_validate(response)
    except ValidationError as exc:
        if isinstance(response, list):
            return _BoundaryResponse.model_validate({"evaluations": response})

        if isinstance(response, dict):
            nested = response.get("data") or response.get("result")
            if isinstance(nested, dict) and "evaluations" in nested:
                return _BoundaryResponse.model_validate(nested)

            if {"candidate_time", "is_chapter_boundary"}.issubset(response):
                return _BoundaryResponse.model_validate({"evaluations": [response]})

            if "evaluations" not in response:
                return _BoundaryResponse(evaluations=[])

        raise ValueError("Invalid boundary evaluation LLM response") from exc


def _boundary_input_payload(item: BoundaryEvaluationInput) -> dict[str, object]:
    return {
        "candidate_time": item.candidate_time,
        "left_context": item.left_context,
        "right_context": item.right_context,
        "scores": {
            "candidate_score": item.candidate_score,
            "lexical_shift_score": item.lexical_shift_score,
            "semantic_shift_score": item.semantic_shift_score,
            "valley_depth_score": item.valley_depth_score,
            "pause_score": item.pause_score,
            "discourse_marker_score": item.discourse_marker_score,
        },
    }


_BOUNDARY_SYSTEM_PROMPT = """
/no_think
You evaluate candidate chapter boundaries for long-form transcript content.
Return only valid JSON with this exact shape:
{"evaluations":[{"candidate_time":number,"is_chapter_boundary":boolean,"confidence":number,"transition_intent":string,"reason":string}]}
Do not return any other top-level keys.
Do not return keys named version, data, label, title, description, or keywords.
Rules:
- Evaluate only candidate_time values provided in the user payload.
- Do not invent timestamps.
- If no candidate is a good boundary, return {"evaluations":[]}.
- confidence must be between 0 and 1.
- transition_intent must be one of the allowed_transition_intents.
- Keep reason concise.
"""
