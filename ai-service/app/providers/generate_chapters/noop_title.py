from app.workflows.generate_chapters.schemas import (
    ChapterTitleInput,
    ChapterTitleResult,
)


class NoopChapterTitleProvider:
    def generate_titles(
        self,
        inputs: list[ChapterTitleInput],
    ) -> list[ChapterTitleResult]:
        _ = inputs
        return []
