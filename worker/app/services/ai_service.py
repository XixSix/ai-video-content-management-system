from pathlib import Path

import grpc

from app.core.config import settings
from app.proto_path import ensure_proto_generated_on_path
from app.schemas.transcript.output import TranscriptJobOptions
from app.schemas.transcript.result import (
    TRANSCRIPT_SOURCE_IMPORTED,
    TranscriptResult,
    TranscriptSegmentResult,
    count_words,
)

ensure_proto_generated_on_path()

from transcription.v1 import transcription_pb2, transcription_pb2_grpc  # noqa: E402


TERMINAL_GRPC_CODES = {
    grpc.StatusCode.INVALID_ARGUMENT,
    grpc.StatusCode.NOT_FOUND,
}


class AIServiceTerminalError(Exception):
    def __init__(self, message: str, *, error_code: str) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}")


class AIServiceClient:
    def __init__(
        self,
        *,
        target: str = settings.ai_service_grpc_target,
        timeout_seconds: int = settings.ai_service_grpc_timeout_seconds,
    ) -> None:
        self.target = target
        self.timeout_seconds = timeout_seconds

    def transcribe(
        self,
        *,
        request_id: str,
        audio_path: Path,
        options: TranscriptJobOptions,
    ) -> TranscriptResult:
        request = _build_request(
            request_id=request_id,
            audio_path=audio_path,
            options=options,
        )

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = transcription_pb2_grpc.TranscriptionServiceStub(channel)
                response = stub.Transcribe(
                    request,
                    timeout=self.timeout_seconds,
                )
        except grpc.RpcError as error:
            if error.code() in TERMINAL_GRPC_CODES:
                raise AIServiceTerminalError(
                    error.details() or "ai-service rejected transcript request",
                    error_code=f"AI_SERVICE_{error.code().name}",
                ) from error

            raise

        return _map_response(
            request_id=request_id,
            response=response,
        )


def _build_request(
    *,
    request_id: str,
    audio_path: Path,
    options: TranscriptJobOptions,
) -> transcription_pb2.TranscribeRequest:
    return transcription_pb2.TranscribeRequest(
        request_id=request_id,
        local_path=str(audio_path),
        filename=audio_path.name,
        content_type="audio/wav",
        options=transcription_pb2.TranscriptionOptions(
            language=options.language,
            enable_vad=options.use_vad,
            enable_diarization=options.use_diarization,
            enable_source_separation=options.source_separation,
        ),
    )


def _map_response(
    *,
    request_id: str,
    response: transcription_pb2.TranscribeResponse,
) -> TranscriptResult:
    if response.request_id != request_id:
        raise AIServiceTerminalError(
            "ai-service response request_id does not match request",
            error_code="AI_SERVICE_INVALID_RESPONSE",
        )

    segments = [
        TranscriptSegmentResult(
            start_time=segment.start_seconds,
            end_time=segment.end_seconds,
            text=segment.text,
            confidence=None,
            speaker_label=None,
        )
        for segment in response.segments
        if segment.text.strip()
    ]

    if not segments:
        raise AIServiceTerminalError(
            "ai-service response did not include transcript segments",
            error_code="AI_SERVICE_INVALID_RESPONSE",
        )

    full_text = response.full_text.strip() or " ".join(
        segment.text for segment in segments
    )
    model = response.asr_model.strip() or "ai-service-unknown"
    language = response.language.strip() or "auto"

    return TranscriptResult(
        language=language,
        source=TRANSCRIPT_SOURCE_IMPORTED,
        model=model,
        full_text=full_text,
        segments=segments,
        word_count=count_words(full_text),
    )


ai_service_client = AIServiceClient()
