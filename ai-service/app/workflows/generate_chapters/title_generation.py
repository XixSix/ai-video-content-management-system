from logging import getLogger

from app.provider_contracts.generate_chapters_title import ChapterTitleProviderPort
from app.schemas.generate_chapters import GenerateChaptersRequest, GeneratedChapter
from app.workflows.generate_chapters.common import segments_in_range
from app.workflows.generate_chapters.schemas import (
    ChapterTitleInput,
    ChapterTitleResult,
)
from app.workflows.generate_chapters.titles import chapter_text

logger = getLogger(__name__)


def apply_generated_titles(
    chapters: list[GeneratedChapter],
    request: GenerateChaptersRequest,
    *,
    provider: ChapterTitleProviderPort,
) -> tuple[list[GeneratedChapter], bool]:
    """Apply optional generated title/summary labels to final chapters.

    Title generation is label-only. Provider failures or invalid result sets
    return the original chapters so timestamp selection and scores remain
    intact.
    """
    inputs = build_chapter_title_inputs(chapters, request)
    if not inputs:
        return chapters, False

    try:
        results = provider.generate_titles(inputs)
    except Exception:
        logger.exception("Chapter title provider failed")
        return chapters, False

    if not results:
        return chapters, False

    normalized_results = _normalize_results(results)
    if normalized_results is None or not _results_are_valid(
        normalized_results,
        chapters,
    ):
        logger.warning("Ignoring invalid generated chapter titles")
        return chapters, False

    results_by_index = {result.chapter_index: result for result in normalized_results}
    titled_chapters: list[GeneratedChapter] = []
    applied = False
    for chapter in chapters:
        result = results_by_index.get(chapter.index)
        if result is None:
            titled_chapters.append(chapter)
            continue

        applied = True
        titled_chapters.append(
            chapter.model_copy(
                update={
                    "title": result.title,
                    "summary": result.summary,
                }
            )
        )

    return titled_chapters, applied


def build_chapter_title_inputs(
    chapters: list[GeneratedChapter],
    request: GenerateChaptersRequest,
) -> list[ChapterTitleInput]:
    """Build title provider inputs from final chapter timestamp ranges."""
    inputs: list[ChapterTitleInput] = []
    for chapter in chapters:
        segments = segments_in_range(
            request,
            chapter.start_seconds,
            chapter.end_seconds,
        )
        inputs.append(
            ChapterTitleInput(
                chapter_index=chapter.index,
                start_time=chapter.start_seconds,
                end_time=chapter.end_seconds,
                language=request.language,
                text=chapter_text(segments),
            )
        )

    return inputs


def _normalize_results(
    results: list[ChapterTitleResult],
) -> list[ChapterTitleResult] | None:
    """Trim provider strings and reject empty titles."""
    normalized: list[ChapterTitleResult] = []
    for result in results:
        title = result.title.strip()
        if not title:
            return None

        summary = result.summary.strip() if result.summary else None
        normalized.append(
            ChapterTitleResult(
                chapter_index=result.chapter_index,
                title=title,
                summary=summary or None,
            )
        )

    return normalized


def _results_are_valid(
    results: list[ChapterTitleResult],
    chapters: list[GeneratedChapter],
) -> bool:
    """Return true only when title results target known chapter indexes once."""
    chapter_indexes = {chapter.index for chapter in chapters}
    seen_indexes: set[int] = set()

    for result in results:
        if result.chapter_index not in chapter_indexes:
            return False

        if result.chapter_index in seen_indexes:
            return False
        seen_indexes.add(result.chapter_index)

    return True
