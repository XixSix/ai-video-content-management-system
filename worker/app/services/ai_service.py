import logging
from pathlib import Path

import grpc

from app.core.config import settings
from app.proto_path import ensure_proto_generated_on_path
from app.schemas.chaptering.embedding import ChapteringEmbeddingResult
from app.schemas.transcript.output import TranscriptJobOptions
from app.schemas.transcript.result import TranscriptResult
from app.utils.ai_chaptering_mapper import (
    build_embed_texts_request,
    map_embed_texts_response,
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
        logger.info(
            "Calling ai-service transcription request_id=%s target=%s",
            request_id,
            self.target,
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

    def embed_texts(
        self,
        *,
        request_id: str,
        texts: list[str],
    ) -> ChapteringEmbeddingResult:
        """Call ai-service for text embeddings and validate the response."""
        request = build_embed_texts_request(request_id=request_id, texts=texts)
        logger.info(
            "Calling ai-service chaptering embeddings request_id=%s target=%s",
            request_id,
            self.target,
        )

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = chaptering_pb2_grpc.ChapteringServiceStub(channel)
                response = stub.EmbedTexts(
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
                    error.details() or "ai-service rejected embedding request",
                    error_code=f"AI_SERVICE_{error.code().name}",
                ) from error

            logger.exception(
                "ai-service retryable chaptering gRPC error request_id=%s",
                request_id,
            )
            raise

        logger.info(
            "ai-service chaptering embeddings completed request_id=%s", request_id
        )
        try:
            return map_embed_texts_response(
                request_id=request_id,
                response=response,
            )
        except ValueError as error:
            logger.warning(
                "ai-service returned invalid chaptering embedding response "
                "request_id=%s error=%s",
                request_id,
                error,
            )
            raise AIServiceTerminalError(
                str(error),
                error_code="AI_SERVICE_INVALID_RESPONSE",
            ) from error


ai_service_client = AIServiceClient()
