from collections.abc import Callable

from app.provider_contracts.chapter_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.errors import UnsupportedChapteringStrategyError
from app.workflows.chaptering.pipelines.segment import (
    run_segment_pipeline as _run_segment_pipeline,
)
from app.workflows.chaptering.pipelines.word import (
    run_word_pipeline as _run_word_pipeline,
)
from app.workflows.chaptering.schemas import ChapteringPipelineConfig

ChapteringPipelineRunner = Callable[..., ChapterGenerationResult]

CHAPTERING_STRATEGY_SEGMENT = "segment"
CHAPTERING_STRATEGY_WORD = "word"


def select_chaptering_pipeline(strategy: str) -> ChapteringPipelineRunner:
    if strategy == CHAPTERING_STRATEGY_SEGMENT:
        return _run_segment_pipeline

    if strategy == CHAPTERING_STRATEGY_WORD:
        return _run_word_pipeline

    raise UnsupportedChapteringStrategyError(strategy)


def run_chapter_generation_pipeline(
    *,
    chaptering_strategy: str,
    request: ChapterGenerationRequest,
    embedding: TextEmbeddingPort,
    boundary_evaluator: ChapterBoundaryEvaluationPort,
    config: ChapteringPipelineConfig,
) -> ChapterGenerationResult:
    """Run the selected chaptering strategy."""
    pipeline = select_chaptering_pipeline(chaptering_strategy)

    return pipeline(
        request=request,
        embedding=embedding,
        boundary_evaluator=boundary_evaluator,
        config=config,
    )
