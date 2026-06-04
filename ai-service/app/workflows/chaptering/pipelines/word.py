from app.provider_contracts.chapter_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.chapter_title import ChapterTitleProviderPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.pipelines.segment import run_segment_pipeline
from app.workflows.chaptering.pipelines.shared import run_units_pipeline
from app.workflows.chaptering.schemas import ChapteringPipelineConfig
from app.workflows.chaptering.word_units import (
    build_word_chapter_units,
    has_usable_word_timestamps,
)


def run_word_pipeline(
    *,
    request: ChapterGenerationRequest,
    embedding: TextEmbeddingPort,
    boundary_evaluator: ChapterBoundaryEvaluationPort,
    title_provider: ChapterTitleProviderPort,
    config: ChapteringPipelineConfig,
) -> ChapterGenerationResult:
    """Generate chapters from word-timestamped transcript units.

    The strategy builds units at real word timestamp boundaries. If the request
    does not include usable word timestamps, it falls back to the segment
    strategy so chapter generation remains available for segment-only inputs.
    """
    if not has_usable_word_timestamps(request.segments):
        return run_segment_pipeline(
            request=request,
            embedding=embedding,
            boundary_evaluator=boundary_evaluator,
            title_provider=title_provider,
            config=config,
        )

    units = build_word_chapter_units(
        request.segments,
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
