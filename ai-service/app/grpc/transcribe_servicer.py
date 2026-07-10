# pyright: reportAttributeAccessIssue=false

from pathlib import Path

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_transcribe_workflow
from app.schemas.transcript import TranscriptResult, TranscriptWordResult
from app.schemas.transcribe import (
    TranscribeRequest,
    TranscribeOptionsInput,
)
from app.workflows.transcribe.errors import (
    InvalidTranscribeResultError,
    UnsupportedAsrStrategyError,
)
from app.workflows.transcribe.workflow import TranscribeWorkflow

ensure_proto_generated_on_path()

from transcribe.v1 import transcribe_pb2, transcribe_pb2_grpc  # type: ignore # noqa: E402


class TranscribeServicer(transcribe_pb2_grpc.TranscribeServiceServicer):
    def __init__(
        self,
        workflow: TranscribeWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_transcribe_workflow()

    def Transcribe(
        self,
        request: transcribe_pb2.TranscribeRequest,
        context: grpc.ServicerContext,
    ) -> transcribe_pb2.TranscribeResponse:
        self._validate_request(request, context)
        workflow_request = self._map_request(request)

        try:
            result = self._workflow.execute(workflow_request)
        except InvalidTranscribeResultError as error:
            return _failed_response(
                request.job_id,
                transcribe_pb2.TRANSCRIBE_ERROR_CODE_ASR_PROVIDER_FAILED,
                str(error),
                retryable=False,
            )
        except UnsupportedAsrStrategyError as error:
            return _failed_response(
                request.job_id,
                transcribe_pb2.TRANSCRIBE_ERROR_CODE_INTERNAL,
                str(error),
                retryable=False,
            )
        except ValueError as error:
            return _failed_response(
                request.job_id,
                transcribe_pb2.TRANSCRIBE_ERROR_CODE_AUDIO_READ_FAILED,
                str(error),
                retryable=False,
            )
        except Exception as error:
            return _failed_response(
                request.job_id,
                transcribe_pb2.TRANSCRIBE_ERROR_CODE_ASR_PROVIDER_FAILED,
                str(error) or "transcribe workflow failed",
                retryable=True,
            )

        return self._map_response(
            request_id=workflow_request.request_id.strip(),
            result=result,
        )

    def _map_request(
        self,
        request: transcribe_pb2.TranscribeRequest,
    ) -> TranscribeRequest:
        return TranscribeRequest(
            request_id=request.job_id.strip(),
            local_path=Path(request.audio.local_path.strip()),
            options=TranscribeOptionsInput(
                language=request.options.language,
                enable_vad=request.options.vad.enabled,
                enable_diarization=request.options.diarization.enabled,
                enable_source_separation=request.options.source_separation.enabled,
                enable_word_timestamps=request.options.word_timestamps.enabled,
            ),
        )

    def _validate_request(
        self,
        request: transcribe_pb2.TranscribeRequest,
        context: grpc.ServicerContext,
    ) -> None:
        job_id = request.job_id.strip()
        source = request.audio.WhichOneof("source")
        local_path = request.audio.local_path.strip()

        if not job_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "job_id is required")

        if source != "local_path":
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "audio.local_path is required",
            )

        if not local_path:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "audio.local_path is required",
            )

        media_path = Path(local_path)
        if not media_path.exists():
            context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"audio.local_path does not exist: {local_path}",
            )

        if not media_path.is_file():
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "audio.local_path must point to a file",
            )

        if media_path.stat().st_size <= 0:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "audio.local_path is empty")

        self._validate_options(request.options)

    def _validate_options(
        self,
        options: transcribe_pb2.TranscribeOptions,
    ) -> None:
        # TODO: validate option combinations when provider capabilities are wired.
        return None

    def _map_response(
        self,
        *,
        request_id: str,
        result: TranscriptResult,
    ) -> transcribe_pb2.TranscribeResponse:
        return transcribe_pb2.TranscribeResponse(
            job_id=request_id,
            status=transcribe_pb2.TRANSCRIBE_STATUS_COMPLETED,
            language=result.language,
            asr_model=result.asr_model,
            segments=[
                transcribe_pb2.TranscriptSegment(
                    start_seconds=segment.start_seconds,
                    end_seconds=segment.end_seconds,
                    text=segment.text,
                    words=[_map_word(word) for word in segment.words],
                )
                for segment in result.segments
            ],
        )


def _map_word(word: TranscriptWordResult) -> transcribe_pb2.TranscriptWord:
    mapped = transcribe_pb2.TranscriptWord(
        start_seconds=word.start_seconds,
        end_seconds=word.end_seconds,
        text=word.text,
    )
    if word.confidence is not None:
        mapped.confidence = word.confidence
    return mapped


def _failed_response(
    job_id: str,
    code: int,
    message: str,
    *,
    retryable: bool,
) -> transcribe_pb2.TranscribeResponse:
    return transcribe_pb2.TranscribeResponse(
        job_id=job_id,
        status=transcribe_pb2.TRANSCRIBE_STATUS_FAILED,
        error=transcribe_pb2.TranscribeError(
            code=code,
            message=message,
            retryable=retryable,
        ),
    )
