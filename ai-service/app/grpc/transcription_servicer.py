from pathlib import Path

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.transcription.mock_transcriber import mock_transcriber

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2, transcription_pb2_grpc  # noqa: E402


class TranscriptionServicer(transcription_pb2_grpc.TranscriptionServiceServicer):
    def Transcribe(
        self,
        request: transcription_pb2.TranscribeRequest,
        context: grpc.ServicerContext,
    ) -> transcription_pb2.TranscribeResponse:
        request_id = request.request_id.strip()
        local_path = request.local_path.strip()

        if not request_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id is required")

        if not local_path:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "local_path is required")

        audio_path = Path(local_path)
        if not audio_path.exists():
            context.abort(grpc.StatusCode.NOT_FOUND, f"local_path does not exist: {local_path}")

        result = mock_transcriber.transcribe(
            local_path=audio_path,
            language=request.options.language,
        )

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
