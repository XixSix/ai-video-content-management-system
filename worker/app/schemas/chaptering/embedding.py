from dataclasses import dataclass


@dataclass(frozen=True)
class TextEmbeddingResult:
    index: int
    values: list[float]


@dataclass(frozen=True)
class ChapteringEmbeddingResult:
    request_id: str
    model: str
    dimension: int
    embeddings: list[TextEmbeddingResult]
