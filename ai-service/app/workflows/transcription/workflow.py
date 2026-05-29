from app.provider_contracts.asr import AsrPort
from app.provider_contracts.audio_normalizer import AudioNormalizerPort
from app.provider_contracts.diarization import DiarizationPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.vad import VadPort
from app.schemas.transcript import TranscriptResult
from app.schemas.transcription_request import TranscriptionRequest
from app.workflows.transcription.errors import (
    InvalidTranscriptResultError,
)
from app.workflows.transcription.pipeline import (
    ASR_STRATEGY_DIARIZED_TURNS,
    ASR_STRATEGY_VAD_CHUNKED,
    run_transcription_pipeline,
)


class TranscriptionWorkflow:
    def __init__(
        self,
        *,
        normalizer: AudioNormalizerPort,
        source_separator: SourceSeparationPort,
        vad: VadPort,
        diarizer: DiarizationPort,
        asr: AsrPort,
    ) -> None:
        self._normalizer = normalizer
        self._source_separator = source_separator
        self._vad = vad
        self._diarizer = diarizer
        self._asr = asr

    def execute(self, request: TranscriptionRequest) -> TranscriptResult:
        asr_strategy = self._get_asr_strategy(request)
        result = run_transcription_pipeline(
            asr_strategy=asr_strategy,
            request=request,
            normalizer=self._normalizer,
            source_separator=self._source_separator,
            vad=self._vad,
            diarizer=self._diarizer,
            asr=self._asr,
        )
        self._validate_result(result)
        return result

    def _get_asr_strategy(self, request: TranscriptionRequest) -> str:
        if request.options.enable_diarization:
            return ASR_STRATEGY_DIARIZED_TURNS

        return ASR_STRATEGY_VAD_CHUNKED

    def _validate_result(self, result: TranscriptResult) -> None:
        if not result.segments:
            raise InvalidTranscriptResultError("transcript must include segments")

        if not result.full_text.strip():
            raise InvalidTranscriptResultError("transcript full_text is required")
