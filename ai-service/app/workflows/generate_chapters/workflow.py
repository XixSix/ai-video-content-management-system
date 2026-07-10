from app.provider_contracts.generate_chapters_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.generate_chapters_title import ChapterTitleProviderPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.generate_chapters import (
    GenerateChaptersRequest,
    GenerateChaptersResult,
)
from app.workflows.generate_chapters.pipeline import (
    GENERATE_CHAPTERS_STRATEGY_SEGMENT,
    GENERATE_CHAPTERS_STRATEGY_WORD,
    run_generate_chapters_pipeline,
)
from app.workflows.generate_chapters.schemas import GenerateChaptersPipelineConfig


class GenerateChaptersWorkflow:
    def __init__(
        self,
        *,
        embedding: TextEmbeddingPort,
        boundary_evaluator: ChapterBoundaryEvaluationPort,
        title_provider: ChapterTitleProviderPort,
        config: GenerateChaptersPipelineConfig,
    ) -> None:
        self._embedding = embedding
        self._boundary_evaluator = boundary_evaluator
        self._title_provider = title_provider
        self._config = config

    def execute(
        self,
        request: GenerateChaptersRequest,
    ) -> GenerateChaptersResult:
        generate_chapters_strategy = self._get_generate_chapters_strategy()
        return run_generate_chapters_pipeline(
            generate_chapters_strategy=generate_chapters_strategy,
            request=request,
            embedding=self._embedding,
            boundary_evaluator=self._boundary_evaluator,
            title_provider=self._title_provider,
            config=self._config,
        )

    def _get_generate_chapters_strategy(self) -> str:
        if self._config.strategy == GENERATE_CHAPTERS_STRATEGY_WORD:
            return GENERATE_CHAPTERS_STRATEGY_WORD

        return GENERATE_CHAPTERS_STRATEGY_SEGMENT
