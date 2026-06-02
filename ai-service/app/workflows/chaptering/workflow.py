from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.schemas import ChapteringPipelineConfig
from app.workflows.chaptering.pipeline import run_chapter_generation_pipeline


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
        return run_chapter_generation_pipeline(
            request=request,
            embedding=self._embedding,
            config=self._config,
        )
