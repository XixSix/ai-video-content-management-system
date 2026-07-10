from typing import Protocol

from app.workflows.generate_chapters.schemas import (
    ChapterTitleInput,
    ChapterTitleResult,
)


class ChapterTitleProviderPort(Protocol):
    def generate_titles(
        self,
        inputs: list[ChapterTitleInput],
    ) -> list[ChapterTitleResult]: ...
