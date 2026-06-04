from typing import Protocol

from app.workflows.chaptering.schemas import ChapterTitleInput, ChapterTitleResult


class ChapterTitleProviderPort(Protocol):
    def generate_titles(
        self,
        inputs: list[ChapterTitleInput],
    ) -> list[ChapterTitleResult]: ...
