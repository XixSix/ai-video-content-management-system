import grpc
import pytest

from app.services import ai_service
from app.services.ai_service import AIServiceClient, AIServiceTerminalError
from app.utils import ai_chaptering_mapper
from chaptering.v1 import chaptering_pb2


def _response(request_id: str = "job-1") -> chaptering_pb2.EmbedTextsResponse:
    return chaptering_pb2.EmbedTextsResponse(
        request_id=request_id,
        model="noop",
        dimension=2,
        embeddings=[
            chaptering_pb2.TextEmbedding(index=0, values=[0.1, 0.2]),
            chaptering_pb2.TextEmbedding(index=1, values=[0.3, 0.4]),
        ],
    )


def test_build_embed_texts_request_maps_texts() -> None:
    request = ai_chaptering_mapper.build_embed_texts_request(
        request_id="job-1",
        texts=["left context", "right context"],
    )

    assert request.request_id == "job-1"
    assert list(request.texts) == ["left context", "right context"]


def test_map_embed_texts_response_returns_embedding_result() -> None:
    result = ai_chaptering_mapper.map_embed_texts_response(
        request_id="job-1",
        response=_response(),
    )

    assert result.request_id == "job-1"
    assert result.model == "noop"
    assert result.dimension == 2
    assert len(result.embeddings) == 2
    assert result.embeddings[0].index == 0
    assert result.embeddings[0].values == pytest.approx([0.1, 0.2])


def test_map_embed_texts_response_rejects_mismatched_request_id() -> None:
    with pytest.raises(ValueError, match="request_id does not match"):
        ai_chaptering_mapper.map_embed_texts_response(
            request_id="job-1",
            response=_response(request_id="other-job"),
        )


def test_map_embed_texts_response_rejects_invalid_dimension() -> None:
    response = chaptering_pb2.EmbedTextsResponse(
        request_id="job-1",
        model="noop",
        dimension=3,
        embeddings=[chaptering_pb2.TextEmbedding(index=0, values=[0.1, 0.2])],
    )

    with pytest.raises(ValueError, match="vector dimension is invalid"):
        ai_chaptering_mapper.map_embed_texts_response(
            request_id="job-1",
            response=response,
        )


class FakeRpcError(grpc.RpcError):
    def __init__(self, code: grpc.StatusCode) -> None:
        self._code = code

    def code(self) -> grpc.StatusCode:
        return self._code

    def details(self) -> str:
        return "grpc failure"


class FakeChannel:
    def __enter__(self) -> "FakeChannel":
        return self

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        return None


class RaisingStub:
    def __init__(self, error: grpc.RpcError) -> None:
        self.error = error

    def EmbedTexts(
        self,
        request: chaptering_pb2.EmbedTextsRequest,
        *,
        timeout: int,
    ) -> chaptering_pb2.EmbedTextsResponse:
        raise self.error


class RespondingStub:
    def __init__(self, response: chaptering_pb2.EmbedTextsResponse) -> None:
        self.response = response

    def EmbedTexts(
        self,
        request: chaptering_pb2.EmbedTextsRequest,
        *,
        timeout: int,
    ) -> chaptering_pb2.EmbedTextsResponse:
        return self.response


def test_client_returns_embedding_result(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        ai_service.grpc,
        "insecure_channel",
        lambda target: FakeChannel(),
    )
    monkeypatch.setattr(
        ai_service.chaptering_pb2_grpc,
        "ChapteringServiceStub",
        lambda channel: RespondingStub(_response()),
    )

    result = AIServiceClient(target="unused").embed_texts(
        request_id="job-1",
        texts=["left", "right"],
    )

    assert result.dimension == 2
    assert len(result.embeddings) == 2


def test_client_maps_terminal_grpc_error(monkeypatch: pytest.MonkeyPatch) -> None:
    grpc_error = FakeRpcError(grpc.StatusCode.INVALID_ARGUMENT)
    monkeypatch.setattr(
        ai_service.grpc,
        "insecure_channel",
        lambda target: FakeChannel(),
    )
    monkeypatch.setattr(
        ai_service.chaptering_pb2_grpc,
        "ChapteringServiceStub",
        lambda channel: RaisingStub(grpc_error),
    )

    with pytest.raises(AIServiceTerminalError) as error:
        AIServiceClient(target="unused").embed_texts(
            request_id="job-1",
            texts=["left", "right"],
        )

    assert error.value.error_code == "AI_SERVICE_INVALID_ARGUMENT"


def test_client_maps_invalid_response_to_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        ai_service.grpc,
        "insecure_channel",
        lambda target: FakeChannel(),
    )
    monkeypatch.setattr(
        ai_service.chaptering_pb2_grpc,
        "ChapteringServiceStub",
        lambda channel: RespondingStub(_response(request_id="other-job")),
    )

    with pytest.raises(AIServiceTerminalError) as error:
        AIServiceClient(target="unused").embed_texts(
            request_id="job-1",
            texts=["left", "right"],
        )

    assert error.value.error_code == "AI_SERVICE_INVALID_RESPONSE"
