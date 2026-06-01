from app.proto_path import ensure_proto_generated_on_path
from app.schemas.chaptering.embedding import (
    ChapteringEmbeddingResult,
    TextEmbeddingResult,
)

ensure_proto_generated_on_path()

from chaptering.v1 import chaptering_pb2  # type: ignore # noqa: E402


def build_embed_texts_request(
    *,
    request_id: str,
    texts: list[str],
) -> chaptering_pb2.EmbedTextsRequest:  # type: ignore
    return chaptering_pb2.EmbedTextsRequest(  # type: ignore
        request_id=request_id,
        texts=texts,
    )


def map_embed_texts_response(
    *,
    request_id: str,
    response: chaptering_pb2.EmbedTextsResponse,  # type: ignore
) -> ChapteringEmbeddingResult:
    if response.request_id != request_id:
        raise ValueError("ai-service response request_id does not match request")

    if response.dimension <= 0:
        raise ValueError("ai-service response embedding dimension must be positive")

    embeddings = [
        TextEmbeddingResult(
            index=embedding.index,
            values=list(embedding.values),
        )
        for embedding in response.embeddings
    ]
    _validate_embeddings(embeddings, dimension=response.dimension)

    return ChapteringEmbeddingResult(
        request_id=response.request_id,
        model=response.model,
        dimension=response.dimension,
        embeddings=embeddings,
    )


def _validate_embeddings(
    embeddings: list[TextEmbeddingResult],
    *,
    dimension: int,
) -> None:
    expected_indexes = list(range(len(embeddings)))
    actual_indexes = [embedding.index for embedding in embeddings]
    if actual_indexes != expected_indexes:
        raise ValueError("ai-service response embedding indexes are invalid")

    if any(len(embedding.values) != dimension for embedding in embeddings):
        raise ValueError("ai-service response embedding vector dimension is invalid")
