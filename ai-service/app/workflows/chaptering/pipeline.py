from collections.abc import Callable

from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.errors import UnsupportedChapteringStrategyError
from app.workflows.chaptering.pipelines.candidate import (
    run_candidate_pipeline as _run_candidate_pipeline,
)
from app.workflows.chaptering.pipelines.rule_based import (
    run_rule_based_pipeline as _run_rule_based_pipeline,
)
from app.workflows.chaptering.schemas import ChapteringPipelineConfig

ChapteringPipelineRunner = Callable[..., ChapterGenerationResult]

CHAPTERING_STRATEGY_CANDIDATE = "candidate"
CHAPTERING_STRATEGY_RULE_BASED = "rule-based"


def select_chaptering_pipeline(strategy: str) -> ChapteringPipelineRunner:
    if strategy == CHAPTERING_STRATEGY_CANDIDATE:
        return _run_candidate_pipeline

    if strategy == CHAPTERING_STRATEGY_RULE_BASED:
        return _run_rule_based_pipeline

    raise UnsupportedChapteringStrategyError(strategy)


def run_chapter_generation_pipeline(
    *,
    chaptering_strategy: str,
    request: ChapterGenerationRequest,
    embedding: TextEmbeddingPort,
    config: ChapteringPipelineConfig,
) -> ChapterGenerationResult:
    """Run the selected chaptering strategy."""
    pipeline = select_chaptering_pipeline(chaptering_strategy)

    if chaptering_strategy == CHAPTERING_STRATEGY_RULE_BASED:
        return pipeline(request=request, config=config)

    return pipeline(request=request, embedding=embedding, config=config)
