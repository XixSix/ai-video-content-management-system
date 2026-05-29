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
    LocalMediaNotFoundError,
    MissingTranscriptionFieldError,
)
from app.workflows.transcription.workflow import TranscriptionWorkflow

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2, transcription_pb2_grpc  # type: ignore # noqa: E402


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
        workflow_request = self._map_request(request)

        try:
            result = self._workflow.execute(workflow_request)
        except MissingTranscriptionFieldError as error:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(error))
        except LocalMediaNotFoundError as error:
            context.abort(grpc.StatusCode.NOT_FOUND, str(error))
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
        local_path = request.local_path.strip()

        return TranscriptionRequest(
            request_id=request.request_id,
            local_path=Path(local_path) if local_path else None,
            filename=request.filename,
            content_type=request.content_type,
            options=TranscriptionOptionsInput(
                language=request.options.language,
                enable_vad=request.options.enable_vad,
                enable_diarization=request.options.enable_diarization,
                enable_source_separation=request.options.enable_source_separation,
            ),
        )

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
