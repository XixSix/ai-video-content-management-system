from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering_embedding import (
    ChapteringEmbeddingRequest,
    ChapteringEmbeddingResult,
    TextEmbeddingResult,
)


def run_chaptering_embedding_pipeline(
    *,
    request: ChapteringEmbeddingRequest,
    embedding: TextEmbeddingPort,
) -> ChapteringEmbeddingResult:
    embeddings = embedding.embed_texts(request.texts)

    return ChapteringEmbeddingResult(
        request_id=request.request_id,
        model=embedding.model_name,
        dimension=embedding.dimension,
        embeddings=[
            TextEmbeddingResult(index=index, values=values)
            for index, values in enumerate(embeddings)
        ],
    )
