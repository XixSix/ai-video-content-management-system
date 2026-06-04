from app.schemas.chaptering import (
    ChapterGenerationRequest,
    ChapteringOptions,
    ChapteringTranscriptSegment,
    GeneratedChapter,
)
from app.workflows.chaptering.schemas import ChapterTitleInput, ChapterTitleResult
from app.workflows.chaptering.title_generation import apply_generated_titles


def test_apply_generated_titles_replaces_matching_chapter_labels() -> None:
    chapters = [_chapter(0, 0, 30), _chapter(1, 30, 60)]

    titled_chapters, applied = apply_generated_titles(
        chapters,
        _request(),
        provider=_FakeChapterTitleProvider(
            [
                ChapterTitleResult(
                    chapter_index=1,
                    title="  Transcript Analysis  ",
                    summary="  Score candidate chapter boundaries.  ",
                )
            ]
        ),
    )

    assert applied is True
    assert titled_chapters[0] == chapters[0]
    assert titled_chapters[1].title == "Transcript Analysis"
    assert titled_chapters[1].summary == "Score candidate chapter boundaries."


def test_apply_generated_titles_keeps_chapters_when_provider_returns_no_results() -> (
    None
):
    chapters = [_chapter(0, 0, 30)]

    titled_chapters, applied = apply_generated_titles(
        chapters,
        _request(),
        provider=_FakeChapterTitleProvider([]),
    )

    assert applied is False
    assert titled_chapters == chapters


def test_apply_generated_titles_rejects_empty_title_batch() -> None:
    chapters = [_chapter(0, 0, 30)]

    titled_chapters, applied = apply_generated_titles(
        chapters,
        _request(),
        provider=_FakeChapterTitleProvider(
            [ChapterTitleResult(chapter_index=0, title="  ")]
        ),
    )

    assert applied is False
    assert titled_chapters == chapters


def test_apply_generated_titles_rejects_unknown_chapter_index() -> None:
    chapters = [_chapter(0, 0, 30)]

    titled_chapters, applied = apply_generated_titles(
        chapters,
        _request(),
        provider=_FakeChapterTitleProvider(
            [ChapterTitleResult(chapter_index=99, title="Unknown")]
        ),
    )

    assert applied is False
    assert titled_chapters == chapters


def test_apply_generated_titles_rejects_duplicate_chapter_index() -> None:
    chapters = [_chapter(0, 0, 30)]

    titled_chapters, applied = apply_generated_titles(
        chapters,
        _request(),
        provider=_FakeChapterTitleProvider(
            [
                ChapterTitleResult(chapter_index=0, title="First"),
                ChapterTitleResult(chapter_index=0, title="Second"),
            ]
        ),
    )

    assert applied is False
    assert titled_chapters == chapters


def test_apply_generated_titles_normalizes_empty_summary_to_none() -> None:
    chapters = [_chapter(0, 0, 30)]

    titled_chapters, applied = apply_generated_titles(
        chapters,
        _request(),
        provider=_FakeChapterTitleProvider(
            [ChapterTitleResult(chapter_index=0, title="Upload Flow", summary="  ")]
        ),
    )

    assert applied is True
    assert titled_chapters[0].title == "Upload Flow"
    assert titled_chapters[0].summary is None


def test_apply_generated_titles_falls_back_when_provider_fails() -> None:
    chapters = [_chapter(0, 0, 30)]

    titled_chapters, applied = apply_generated_titles(
        chapters,
        _request(),
        provider=_FailingChapterTitleProvider(),
    )

    assert applied is False
    assert titled_chapters == chapters


def _chapter(index: int, start: float, end: float) -> GeneratedChapter:
    return GeneratedChapter(
        index=index,
        start_seconds=start,
        end_seconds=end,
        title=f"Chapter {index + 1}",
        summary=None,
    )


def _request() -> ChapterGenerationRequest:
    return ChapterGenerationRequest(
        request_id="chapter-title-test",
        language="en",
        media_duration_seconds=60,
        segments=[
            ChapteringTranscriptSegment(
                segment_id="seg-1",
                start_seconds=0,
                end_seconds=30,
                text="Upload media and validate files.",
            ),
            ChapteringTranscriptSegment(
                segment_id="seg-2",
                start_seconds=30,
                end_seconds=60,
                text="Score chapter boundaries and build chapters.",
            ),
        ],
        options=ChapteringOptions(
            min_chapter_duration_seconds=10,
            target_chapter_duration_seconds=30,
            max_chapter_duration_seconds=60,
            max_chapters=3,
            use_embeddings=False,
            use_llm=True,
        ),
    )


class _FakeChapterTitleProvider:
    def __init__(self, results: list[ChapterTitleResult]) -> None:
        self.inputs: list[ChapterTitleInput] = []
        self._results = results

    def generate_titles(
        self,
        inputs: list[ChapterTitleInput],
    ) -> list[ChapterTitleResult]:
        self.inputs = inputs
        return self._results


class _FailingChapterTitleProvider:
    def generate_titles(
        self,
        inputs: list[ChapterTitleInput],
    ) -> list[ChapterTitleResult]:
        _ = inputs
        raise RuntimeError("provider failed")
