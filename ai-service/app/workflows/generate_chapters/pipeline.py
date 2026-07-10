from collections.abc import Callable

from app.provider_contracts.generate_chapters_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.generate_chapters_title import ChapterTitleProviderPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.generate_chapters import (
    GenerateChaptersRequest,
    GenerateChaptersResult,
)
from app.workflows.generate_chapters.errors import (
    UnsupportedGenerateChaptersStrategyError,
)
from app.workflows.generate_chapters.pipelines.segment import (
    run_segment_pipeline as _run_segment_pipeline,
)
from app.workflows.generate_chapters.pipelines.word import (
    run_word_pipeline as _run_word_pipeline,
)
from app.workflows.generate_chapters.schemas import GenerateChaptersPipelineConfig

GenerateChaptersPipelineRunner = Callable[..., GenerateChaptersResult]

GENERATE_CHAPTERS_STRATEGY_SEGMENT = "segment"
GENERATE_CHAPTERS_STRATEGY_WORD = "word"


def select_generate_chapters_pipeline(strategy: str) -> GenerateChaptersPipelineRunner:
    if strategy == GENERATE_CHAPTERS_STRATEGY_SEGMENT:
        return _run_segment_pipeline

    if strategy == GENERATE_CHAPTERS_STRATEGY_WORD:
        return _run_word_pipeline

    raise UnsupportedGenerateChaptersStrategyError(strategy)


def run_generate_chapters_pipeline(
    *,
    generate_chapters_strategy: str,
    request: GenerateChaptersRequest,
    embedding: TextEmbeddingPort,
    boundary_evaluator: ChapterBoundaryEvaluationPort,
    title_provider: ChapterTitleProviderPort,
    config: GenerateChaptersPipelineConfig,
) -> GenerateChaptersResult:
    """Run the selected generate_chapters strategy."""
    pipeline = select_generate_chapters_pipeline(generate_chapters_strategy)

    return pipeline(
        request=request,
        embedding=embedding,
        boundary_evaluator=boundary_evaluator,
        title_provider=title_provider,
        config=config,
    )
