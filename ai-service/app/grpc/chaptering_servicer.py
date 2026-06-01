# pyright: reportAttributeAccessIssue=false

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_chaptering_workflow
from app.schemas.chaptering_embedding import (
    ChapteringEmbeddingRequest,
    ChapteringEmbeddingResult,
)
from app.workflows.chaptering.workflow import ChapteringWorkflow

ensure_proto_generated_on_path()

from chaptering.v1 import chaptering_pb2, chaptering_pb2_grpc  # type: ignore # noqa: E402


class ChapteringServicer(chaptering_pb2_grpc.ChapteringServiceServicer):
    def __init__(
        self,
        workflow: ChapteringWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_chaptering_workflow()

    def EmbedTexts(
        self,
        request: chaptering_pb2.EmbedTextsRequest,
        context: grpc.ServicerContext,
    ) -> chaptering_pb2.EmbedTextsResponse:
        self._validate_request(request, context)
        workflow_request = self._map_request(request)
        result = self._workflow.execute(workflow_request)
        return self._map_response(result)

    def _map_response(
        self,
        result: ChapteringEmbeddingResult,
    ) -> chaptering_pb2.EmbedTextsResponse:
        return chaptering_pb2.EmbedTextsResponse(
            request_id=result.request_id,
            model=result.model,
            dimension=result.dimension,
            embeddings=[
                chaptering_pb2.TextEmbedding(
                    index=embedding.index,
                    values=embedding.values,
                )
                for embedding in result.embeddings
            ],
        )

    def _validate_request(
        self,
        request: chaptering_pb2.EmbedTextsRequest,
        context: grpc.ServicerContext,
    ) -> None:
        request_id = request.request_id.strip()

        if not request_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id is required")

    def _map_request(
        self,
        request: chaptering_pb2.EmbedTextsRequest,
    ) -> ChapteringEmbeddingRequest:
        return ChapteringEmbeddingRequest(
            request_id=request.request_id.strip(),
            texts=list(request.texts),
        )
