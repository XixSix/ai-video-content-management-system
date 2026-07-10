from app.provider_contracts.generate_chapters_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.generate_chapters_title import ChapterTitleProviderPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.generate_chapters import (
    GenerateChaptersRequest,
    GenerateChaptersResult,
)
from app.workflows.generate_chapters.pipelines.segment import run_segment_pipeline
from app.workflows.generate_chapters.pipelines.shared import run_units_pipeline
from app.workflows.generate_chapters.schemas import GenerateChaptersPipelineConfig
from app.workflows.generate_chapters.word_units import (
    build_word_chapter_units,
    collect_timeline_words,
    has_sufficient_word_alignment_coverage,
)


def run_word_pipeline(
    *,
    request: GenerateChaptersRequest,
    embedding: TextEmbeddingPort,
    boundary_evaluator: ChapterBoundaryEvaluationPort,
    title_provider: ChapterTitleProviderPort,
    config: GenerateChaptersPipelineConfig,
) -> GenerateChaptersResult:
    """Generate chapters from word-timestamped transcript units.

    The strategy builds units at real word timestamp boundaries. If the request
    does not include usable word timestamps, it falls back to the segment
    strategy so chapter generation remains available for segment-only inputs.
    """
    timeline_words = collect_timeline_words(request.segments)
    if not has_sufficient_word_alignment_coverage(request.segments, timeline_words):
        return run_segment_pipeline(
            request=request,
            embedding=embedding,
            boundary_evaluator=boundary_evaluator,
            title_provider=title_provider,
            config=config,
        )

    units = build_word_chapter_units(
        timeline_words,
        max_unit_duration=config.max_unit_duration_seconds,
        pause_boundary_seconds=config.pause_boundary_seconds,
        target_unit_duration=config.target_unit_duration_seconds,
        target_unit_words=config.target_unit_words,
        max_unit_words=config.max_unit_words,
        max_unit_chars=config.max_unit_chars,
    )
    return run_units_pipeline(
        request=request,
        units=units,
        embedding=embedding,
        boundary_evaluator=boundary_evaluator,
        title_provider=title_provider,
        config=config,
    )
