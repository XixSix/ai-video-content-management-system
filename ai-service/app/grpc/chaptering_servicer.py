# pyright: reportAttributeAccessIssue=false

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_chaptering_workflow
from app.workflows.chaptering.workflow import ChapteringWorkflow

ensure_proto_generated_on_path()

from chaptering.v1 import chaptering_pb2, chaptering_pb2_grpc  # type: ignore # noqa: E402


class ChapteringServicer(chaptering_pb2_grpc.ChapteringServiceServicer):
    def __init__(
        self,
        workflow: ChapteringWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_chaptering_workflow()

    def GenerateChapters(
        self,
        request: chaptering_pb2.GenerateChaptersRequest,
        context: grpc.ServicerContext,
    ) -> chaptering_pb2.GenerateChaptersResponse:
        self._validate_request(request, context)

        context.abort(
            grpc.StatusCode.UNIMPLEMENTED,
            "GenerateChapters workflow is not implemented yet",
        )

    def _validate_request(
        self,
        request: chaptering_pb2.GenerateChaptersRequest,
        context: grpc.ServicerContext,
    ) -> None:
        request_id = request.request_id.strip()

        if not request_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id is required")

        if not request.segments:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "segments are required")

        for index, segment in enumerate(request.segments):
            if segment.start_seconds >= segment.end_seconds:
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"segments[{index}] must have start_seconds < end_seconds",
                )
            if not segment.text.strip():
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"segments[{index}].text is required",
                )

        if request.options.max_chapters <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.max_chapters must be greater than 0",
            )
