from pydantic import BaseModel, ConfigDict


class ChapteringEmbeddingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    texts: list[str]


class TextEmbeddingResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    index: int
    values: list[float]


class ChapteringEmbeddingResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    request_id: str
    embeddings: list[TextEmbeddingResult]
    model: str
    dimension: int
