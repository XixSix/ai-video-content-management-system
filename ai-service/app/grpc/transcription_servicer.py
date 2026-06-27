# pyright: reportAttributeAccessIssue=false

from pathlib import Path

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_transcription_workflow
from app.schemas.transcript import TranscriptResult
from app.schemas.transcription_request import (
    TranscriptionRequest,
    TranscriptionOptionsInput,
)
from app.workflows.transcription.errors import (
    InvalidTranscriptResultError,
)
from app.workflows.transcription.workflow import TranscriptionWorkflow

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2, transcription_pb2_grpc  # type: ignore # noqa: E402

SUPPORTED_CONTENT_TYPE_PREFIXES = "audio/"


class TranscriptionServicer(transcription_pb2_grpc.TranscriptionServiceServicer):
    def __init__(
        self,
        workflow: TranscriptionWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_transcription_workflow()

    def Transcribe(
        self,
        request: transcription_pb2.TranscribeRequest,
        context: grpc.ServicerContext,
    ) -> transcription_pb2.TranscribeResponse:
        self._validate_request(request, context)
        workflow_request = self._map_request(request)

        try:
            result = self._workflow.execute(workflow_request)
        except InvalidTranscriptResultError as error:
            context.abort(grpc.StatusCode.INTERNAL, str(error))

        return self._map_response(
            request_id=workflow_request.request_id.strip(),
            result=result,
        )

    def _map_request(
        self,
        request: transcription_pb2.TranscribeRequest,
    ) -> TranscriptionRequest:
        return TranscriptionRequest(
            request_id=request.request_id.strip(),
            local_path=Path(request.local_path.strip()),
            filename=request.filename.strip(),
            content_type=request.content_type.strip(),
            options=TranscriptionOptionsInput(
                language=request.options.language,
                enable_vad=request.options.enable_vad,
                enable_diarization=request.options.enable_diarization,
                enable_source_separation=request.options.enable_source_separation,
            ),
        )

    def _validate_request(
        self,
        request: transcription_pb2.TranscribeRequest,
        context: grpc.ServicerContext,
    ) -> None:
        request_id = request.request_id.strip()
        local_path = request.local_path.strip()
        filename = request.filename.strip()
        content_type = request.content_type.strip()

        if not request_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id is required")

        if not local_path:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "local_path is required")

        media_path = Path(local_path)
        if not media_path.exists():
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"local_path does not exist: {local_path}",
            )

        if not media_path.is_file():
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "local_path must point to a file",
            )

        if media_path.stat().st_size <= 0:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "local_path is empty")

        if not filename:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "filename is required")

        if Path(filename).name != filename:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "filename must not include path separators",
            )

        if not content_type:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "content_type is required")

        if not content_type.startswith(SUPPORTED_CONTENT_TYPE_PREFIXES):
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "content_type must be an audio/* media type",
            )

        self._validate_options(request.options)

    def _validate_options(
        self,
        options: transcription_pb2.TranscriptionOptions,
    ) -> None:
        # TODO: validate option combinations when provider capabilities are wired.
        return None

    def _map_response(
        self,
        *,
        request_id: str,
        result: TranscriptResult,
    ) -> transcription_pb2.TranscribeResponse:
        return transcription_pb2.TranscribeResponse(
            request_id=request_id,
            full_text=result.full_text,
            language=result.language,
            asr_model=result.asr_model,
            diarization_model=result.diarization_model,
            source_separation_model=result.source_separation_model,
            segments=[
                transcription_pb2.TranscriptSegment(
                    segment_id=segment.segment_id,
                    start_seconds=segment.start_seconds,
                    end_seconds=segment.end_seconds,
                    text=segment.text,
                )
                for segment in result.segments
            ],
        )
