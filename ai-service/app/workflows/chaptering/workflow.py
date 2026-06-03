from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.pipeline import (
    CHAPTERING_STRATEGY_SEGMENT,
    CHAPTERING_STRATEGY_WORD,
    run_chapter_generation_pipeline,
)
from app.workflows.chaptering.schemas import ChapteringPipelineConfig


class ChapteringWorkflow:
    def __init__(
        self,
        *,
        embedding: TextEmbeddingPort,
        config: ChapteringPipelineConfig,
    ) -> None:
        self._embedding = embedding
        self._config = config

    def execute(
        self,
        request: ChapterGenerationRequest,
    ) -> ChapterGenerationResult:
        chaptering_strategy = self._get_chaptering_strategy()
        return run_chapter_generation_pipeline(
            chaptering_strategy=chaptering_strategy,
            request=request,
            embedding=self._embedding,
            config=self._config,
        )

    def _get_chaptering_strategy(self) -> str:
        if self._config.strategy == CHAPTERING_STRATEGY_WORD:
            return CHAPTERING_STRATEGY_WORD

        return CHAPTERING_STRATEGY_SEGMENT
