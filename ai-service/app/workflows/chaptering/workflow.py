from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering_embedding import (
    ChapteringEmbeddingRequest,
    ChapteringEmbeddingResult,
    TextEmbeddingResult,
)


class ChapteringWorkflow:
    def __init__(
        self,
        *,
        embedding: TextEmbeddingPort,
    ) -> None:
        self._embedding = embedding

    def embed_texts(
        self,
        request: ChapteringEmbeddingRequest,
    ) -> ChapteringEmbeddingResult:
        embeddings = self._embedding.embed_texts(request.texts)

        return ChapteringEmbeddingResult(
            request_id=request.request_id,
            model=self._embedding.model_name,
            dimension=self._embedding.dimension,
            embeddings=[
                TextEmbeddingResult(index=index, values=values)
                for index, values in enumerate(embeddings)
            ],
        )
