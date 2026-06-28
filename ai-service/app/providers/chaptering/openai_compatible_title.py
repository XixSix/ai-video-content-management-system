from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.provider_contracts.llm import JsonChatClientPort
from app.workflows.chaptering.schemas import ChapterTitleInput, ChapterTitleResult

TITLE_MAX_LENGTH = 80
SUMMARY_MAX_LENGTH = 240


class OpenAICompatibleChapterTitleProvider:
    def __init__(self, *, chat_client: JsonChatClientPort) -> None:
        self._chat_client = chat_client

    def generate_titles(
        self,
        inputs: list[ChapterTitleInput],
    ) -> list[ChapterTitleResult]:
        if not inputs:
            return []

        response = self._chat_client.complete_json(
            system_prompt=_TITLE_SYSTEM_PROMPT,
            user_payload={
                "task": "chapter_title_generation",
                "chapters": [_title_input_payload(item) for item in inputs],
            },
        )
        try:
            parsed = _TitleResponse.model_validate(response)
        except ValidationError as exc:
            raise ValueError("Invalid chapter title LLM response") from exc

        return [
            ChapterTitleResult(
                chapter_index=item.chapter_index,
                title=_truncate_text(item.title.strip(), TITLE_MAX_LENGTH),
                summary=(
                    _truncate_text(item.summary.strip(), SUMMARY_MAX_LENGTH)
                    if item.summary
                    else None
                ),
            )
            for item in parsed.chapters
        ]


class _TitleItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chapter_index: int
    title: str = Field(min_length=1)
    summary: str | None = None


class _TitleResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    chapters: list[_TitleItem] = Field(default_factory=list)


def _title_input_payload(item: ChapterTitleInput) -> dict[str, object]:
    return {
        "chapter_index": item.chapter_index,
        "start_time": item.start_time,
        "end_time": item.end_time,
        "language": item.language,
        "text": item.text,
    }


def _truncate_text(text: str, max_length: int) -> str:
    if len(text) <= max_length:
        return text

    return f"{text[: max_length - 3].rstrip()}..."


_TITLE_SYSTEM_PROMPT = """
/no_think
You write concise chapter labels for transcript chapters.
Return only valid JSON with this exact shape:
{"chapters":[{"chapter_index":integer,"title":string,"summary":string|null}]}
Rules:
- Use only chapter_index values provided in the user payload.
- Do not invent timestamps or chapter indexes.
- title must be short and specific.
- summary must be one sentence or null.
"""
