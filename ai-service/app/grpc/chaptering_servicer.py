# pyright: reportAttributeAccessIssue=false

import grpc

from app.proto_path import ensure_proto_generated_on_path

ensure_proto_generated_on_path()

from chaptering.v1 import chaptering_pb2, chaptering_pb2_grpc  # type: ignore # noqa: E402


class ChapteringServicer(chaptering_pb2_grpc.ChapteringServiceServicer):
    def EmbedTexts(
        self,
        request: chaptering_pb2.EmbedTextsRequest,
        context: grpc.ServicerContext,
    ) -> chaptering_pb2.EmbedTextsResponse:
        context.abort(
            grpc.StatusCode.UNIMPLEMENTED,
            "Chaptering embedding service is not implemented yet",
        )
