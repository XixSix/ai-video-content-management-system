from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering_embedding import (
    ChapteringEmbeddingRequest,
    ChapteringEmbeddingResult,
)
from app.workflows.chaptering.pipeline import run_chaptering_embedding_pipeline


class ChapteringWorkflow:
    def __init__(
        self,
        *,
        embedding: TextEmbeddingPort,
    ) -> None:
        self._embedding = embedding

    def execute(
        self,
        request: ChapteringEmbeddingRequest,
    ) -> ChapteringEmbeddingResult:
        return run_chaptering_embedding_pipeline(
            request=request,
            embedding=self._embedding,
        )
