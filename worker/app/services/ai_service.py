import logging
from pathlib import Path

import grpc

from app.core.config import settings
from app.proto_path import ensure_proto_generated_on_path
from app.schemas.chaptering.output import ChapteringJobOptions
from app.schemas.chaptering.result import ChapteringResult, ChapteringTranscript
from app.schemas.transcript.output import TranscriptJobOptions
from app.schemas.transcript.result import TranscriptResult
from app.utils.ai_chaptering_mapper import (
    build_generate_chapters_request,
    map_generate_chapters_response,
)
from app.utils.ai_transcription_mapper import (
    build_transcribe_request,
    map_transcribe_response,
)

ensure_proto_generated_on_path()

from chaptering.v1 import chaptering_pb2_grpc  # type: ignore # noqa: E402
from transcription.v1 import transcription_pb2_grpc  # type: ignore # noqa: E402

logger = logging.getLogger(__name__)


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
        request = build_transcribe_request(
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
                logger.warning(
                    "ai-service terminal gRPC error request_id=%s code=%s",
                    request_id,
                    error.code().name,
                )
                raise AIServiceTerminalError(
                    error.details() or "ai-service rejected transcript request",
                    error_code=f"AI_SERVICE_{error.code().name}",
                ) from error

            logger.exception(
                "ai-service retryable gRPC error request_id=%s", request_id
            )
            raise

        logger.info("ai-service transcription completed request_id=%s", request_id)
        try:
            return map_transcribe_response(
                request_id=request_id,
                response=response,
            )
        except ValueError as error:
            logger.warning(
                "ai-service returned invalid response request_id=%s error=%s",
                request_id,
                error,
            )
            raise AIServiceTerminalError(
                str(error),
                error_code="AI_SERVICE_INVALID_RESPONSE",
            ) from error

    def generate_chapters(
        self,
        *,
        request_id: str,
        transcript: ChapteringTranscript,
        options: ChapteringJobOptions,
    ) -> ChapteringResult:
        request = build_generate_chapters_request(
            request_id=request_id,
            transcript=transcript,
            options=options,
        )

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = chaptering_pb2_grpc.ChapteringServiceStub(channel)
                response = stub.GenerateChapters(
                    request,
                    timeout=self.timeout_seconds,
                )
        except grpc.RpcError as error:
            if error.code() in TERMINAL_GRPC_CODES:
                logger.warning(
                    "ai-service terminal chaptering gRPC error request_id=%s code=%s",
                    request_id,
                    error.code().name,
                )
                raise AIServiceTerminalError(
                    error.details() or "ai-service rejected chaptering request",
                    error_code=f"AI_SERVICE_{error.code().name}",
                ) from error

            logger.exception(
                "ai-service retryable chaptering gRPC error request_id=%s",
                request_id,
            )
            raise

        logger.info("ai-service chaptering completed request_id=%s", request_id)
        try:
            return map_generate_chapters_response(
                request_id=request_id,
                transcript=transcript,
                response=response,
            )
        except ValueError as error:
            logger.warning(
                "ai-service returned invalid chaptering response "
                "request_id=%s error=%s",
                request_id,
                error,
            )
            raise AIServiceTerminalError(
                str(error),
                error_code="AI_SERVICE_INVALID_RESPONSE",
            ) from error


ai_service_client = AIServiceClient()
