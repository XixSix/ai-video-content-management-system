from pathlib import Path

from app.provider_contracts.asr import AsrPort
from app.provider_contracts.audio_normalizer import AudioNormalizerPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.vad import VadPort
from app.schemas.transcript import TranscriptResult
from app.schemas.transcription_request import TranscriptionRequest
from app.workflows.transcription.errors import (
    InvalidTranscriptResultError,
    LocalMediaNotFoundError,
    MissingTranscriptionFieldError,
)


class TranscriptionWorkflow:
    def __init__(
        self,
        *,
        normalizer: AudioNormalizerPort,
        source_separator: SourceSeparationPort,
        vad: VadPort,
        asr: AsrPort,
    ) -> None:
        self._normalizer = normalizer
        self._source_separator = source_separator
        self._vad = vad
        self._asr = asr

    def execute(self, request: TranscriptionRequest) -> TranscriptResult:
        self._validate_request(request)

        local_path = self._validate_request(request)

        audio_path = self._normalizer.normalize(local_path)

        if request.options.enable_source_separation:
            audio_path = self._source_separator.separate(audio_path)

        if request.options.enable_vad:
            audio_path = self._vad.apply(audio_path)

        result = self._asr.transcribe(
            local_path=audio_path,
            language=request.options.language,
        )
        self._validate_result(result)
        return result

    def _validate_request(self, request: TranscriptionRequest) -> Path:
        if not request.request_id.strip():
            raise MissingTranscriptionFieldError("request_id")

        if request.local_path is None:
            raise MissingTranscriptionFieldError("local_path")

        if not request.local_path.exists():
            raise LocalMediaNotFoundError(request.local_path)

        return request.local_path

    def _validate_result(self, result: TranscriptResult) -> None:
        if not result.segments:
            raise InvalidTranscriptResultError("transcript must include segments")

        if not result.full_text.strip():
            raise InvalidTranscriptResultError("transcript full_text is required")
