from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.errors import ChapterGenerationNotImplementedError


def run_chapter_generation_pipeline(
    *,
    request: ChapterGenerationRequest,
    embedding: TextEmbeddingPort,
) -> ChapterGenerationResult:
    _ = request, embedding
    raise ChapterGenerationNotImplementedError(
        "chapter generation pipeline is not implemented yet"
    )
