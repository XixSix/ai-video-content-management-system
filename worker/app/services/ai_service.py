import logging
from pathlib import Path

import grpc

from app.core.config import settings
from app.errors import ServiceError
from app.proto_path import ensure_proto_generated_on_path
from app.schemas.chapters.input import GenerateChaptersOptions
from app.schemas.chapters.result import (
    GeneratedChaptersResult,
    GenerateChaptersTranscript,
)
from app.db.short_clip_repository import ShortClipSource
from app.schemas.short_clip.input import GenerateShortClipsOptions
from app.schemas.short_clip.result import ShortClipCandidateResult
from app.schemas.transcribe.input import TranscribeOptions
from app.schemas.transcribe.result import TranscriptResult
from app.utils.ai_generate_chapters_mapper import (
    build_generate_chapters_request,
    map_generate_chapters_response,
)
from app.utils.ai_short_clip_mapper import (
    build_generate_short_clips_request,
    map_generate_short_clips_response,
)
from app.utils.ai_transcribe_mapper import (
    build_transcribe_request,
    map_transcribe_response,
)

ensure_proto_generated_on_path()

from generate_chapters.v1 import generate_chapters_pb2_grpc  # type: ignore # noqa: E402
from generate_short_clips.v1 import generate_short_clips_pb2_grpc  # type: ignore # noqa: E402
from transcribe.v1 import transcribe_pb2_grpc  # type: ignore # noqa: E402

logger = logging.getLogger(__name__)


TERMINAL_GRPC_CODES = {
    grpc.StatusCode.INVALID_ARGUMENT,
    grpc.StatusCode.NOT_FOUND,
}


class AIServiceTerminalError(ServiceError):
    pass


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
        options: TranscribeOptions,
    ) -> TranscriptResult:
        request = build_transcribe_request(
            request_id=request_id,
            audio_path=audio_path,
            options=options,
        )

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = transcribe_pb2_grpc.TranscribeServiceStub(channel)
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
        transcript: GenerateChaptersTranscript,
        options: GenerateChaptersOptions,
    ) -> GeneratedChaptersResult:
        request = build_generate_chapters_request(
            request_id=request_id,
            transcript=transcript,
            options=options,
        )

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = generate_chapters_pb2_grpc.GenerateChaptersServiceStub(channel)
                response = stub.GenerateChapters(
                    request,
                    timeout=self.timeout_seconds,
                )
        except grpc.RpcError as error:
            if error.code() in TERMINAL_GRPC_CODES:
                logger.warning(
                    "ai-service terminal chapter generation gRPC error request_id=%s code=%s",
                    request_id,
                    error.code().name,
                )
                raise AIServiceTerminalError(
                    error.details() or "ai-service rejected chapter generation request",
                    error_code=f"AI_SERVICE_{error.code().name}",
                ) from error

            logger.exception(
                "ai-service retryable chapter generation gRPC error request_id=%s",
                request_id,
            )
            raise

        logger.info("ai-service chapter generation completed request_id=%s", request_id)
        try:
            return map_generate_chapters_response(
                request_id=request_id,
                transcript=transcript,
                response=response,
            )
        except ValueError as error:
            logger.warning(
                "ai-service returned invalid chapter generation response "
                "request_id=%s error=%s",
                request_id,
                error,
            )
            raise AIServiceTerminalError(
                str(error),
                error_code="AI_SERVICE_INVALID_RESPONSE",
            ) from error

    def generate_short_clip_candidates(
        self,
        *,
        request_id: str,
        source: ShortClipSource,
        options: GenerateShortClipsOptions,
    ) -> list[ShortClipCandidateResult]:
        request = build_generate_short_clips_request(
            request_id=request_id,
            source=source,
            options=options,
        )

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = generate_short_clips_pb2_grpc.GenerateShortClipsServiceStub(
                    channel
                )
                response = stub.GenerateShortClips(
                    request,
                    timeout=self.timeout_seconds,
                )
        except grpc.RpcError as error:
            if error.code() in TERMINAL_GRPC_CODES:
                logger.warning(
                    "ai-service terminal short clip gRPC error request_id=%s code=%s",
                    request_id,
                    error.code().name,
                )
                raise AIServiceTerminalError(
                    error.details() or "ai-service rejected short clip request",
                    error_code=f"AI_SERVICE_{error.code().name}",
                ) from error

            logger.exception(
                "ai-service retryable short clip gRPC error request_id=%s",
                request_id,
            )
            raise

        logger.info("ai-service short clip completed request_id=%s", request_id)
        try:
            return map_generate_short_clips_response(
                request_id=request_id,
                source=source,
                response=response,
            )
        except ValueError as error:
            logger.warning(
                "ai-service returned invalid short clip response "
                "request_id=%s error=%s",
                request_id,
                error,
            )
            raise AIServiceTerminalError(
                str(error),
                error_code="AI_SERVICE_INVALID_RESPONSE",
            ) from error


ai_service_client = AIServiceClient()
