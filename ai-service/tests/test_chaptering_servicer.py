# pyright: reportAttributeAccessIssue=false

import grpc
import pytest

from app.grpc.chaptering_servicer import ChapteringServicer
from app.providers.chaptering.noop_embedding import (
    NOOP_EMBEDDING_DIMENSION,
    NoopTextEmbeddingProvider,
)
from app.schemas.chaptering_embedding import ChapteringEmbeddingRequest
from app.workflows.chaptering.workflow import ChapteringWorkflow
from chaptering.v1 import chaptering_pb2


class AbortError(Exception):
    def __init__(self, code: grpc.StatusCode, details: str) -> None:
        self.code = code
        self.details = details
        super().__init__(details)


class FakeContext:
    def abort(self, code: grpc.StatusCode, details: str) -> None:
        raise AbortError(code, details)


def test_embed_texts_returns_noop_embeddings() -> None:
    request = chaptering_pb2.EmbedTextsRequest(
        request_id=" job-1 ",
        texts=["Topic introduction", "Next topic"],
    )

    response = ChapteringServicer().EmbedTexts(request, FakeContext())
    repeated_response = ChapteringServicer().EmbedTexts(request, FakeContext())

    assert response.request_id == "job-1"
    assert response.model == ""
    assert response.dimension == NOOP_EMBEDDING_DIMENSION
    assert [embedding.index for embedding in response.embeddings] == [0, 1]
    assert [len(embedding.values) for embedding in response.embeddings] == [
        NOOP_EMBEDDING_DIMENSION,
        NOOP_EMBEDDING_DIMENSION,
    ]
    assert response.embeddings[0].values == repeated_response.embeddings[0].values
    assert response.embeddings[0].values != response.embeddings[1].values


def test_chaptering_workflow_returns_noop_embeddings() -> None:
    workflow = ChapteringWorkflow(embedding=NoopTextEmbeddingProvider())

    result = workflow.execute(
        ChapteringEmbeddingRequest(
            request_id="job-1",
            texts=["Topic introduction"],
        )
    )

    assert result.request_id == "job-1"
    assert result.model == ""
    assert result.dimension == NOOP_EMBEDDING_DIMENSION
    assert len(result.embeddings) == 1
    assert result.embeddings[0].index == 0
    assert len(result.embeddings[0].values) == NOOP_EMBEDDING_DIMENSION


def test_embed_texts_rejects_missing_request_id() -> None:
    request = chaptering_pb2.EmbedTextsRequest(request_id="", texts=["Topic"])

    with pytest.raises(AbortError) as error:
        ChapteringServicer().EmbedTexts(request, FakeContext())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
