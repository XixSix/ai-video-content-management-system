from app.provider_contracts.asr import AsrPort
from app.provider_contracts.audio_decoder import AudioDecoderPort
from app.provider_contracts.audio_preprocessing import AudioPreprocessorPort
from app.provider_contracts.diarization import DiarizationPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.vad import VadPort
from app.schemas.transcript import TranscriptResult
from app.schemas.transcribe import TranscribeRequest
from app.workflows.transcribe.errors import (
    InvalidTranscribeResultError,
)
from app.workflows.transcribe.pipeline import (
    ASR_STRATEGY_DIARIZED_TURNS,
    ASR_STRATEGY_VAD_CHUNKED,
    run_transcribe_pipeline,
)
from app.workflows.transcribe.config import TranscribePipelineConfig


class TranscribeWorkflow:
    def __init__(
        self,
        *,
        audio_decoder: AudioDecoderPort,
        audio_preprocessor: AudioPreprocessorPort,
        source_separator: SourceSeparationPort,
        vad: VadPort,
        diarizer: DiarizationPort,
        asr: AsrPort,
        config: TranscribePipelineConfig,
    ) -> None:
        self._audio_decoder = audio_decoder
        self._audio_preprocessor = audio_preprocessor
        self._source_separator = source_separator
        self._vad = vad
        self._diarizer = diarizer
        self._asr = asr
        self._config = config

    def execute(self, request: TranscribeRequest) -> TranscriptResult:
        asr_strategy = self._get_asr_strategy(request)
        result = run_transcribe_pipeline(
            asr_strategy=asr_strategy,
            request=request,
            audio_decoder=self._audio_decoder,
            audio_preprocessor=self._audio_preprocessor,
            source_separator=self._source_separator,
            vad=self._vad,
            diarizer=self._diarizer,
            asr=self._asr,
            config=self._config,
        )
        self._validate_result(result)
        return result

    def _get_asr_strategy(self, request: TranscribeRequest) -> str:
        if request.options.enable_diarization:
            return ASR_STRATEGY_DIARIZED_TURNS

        return ASR_STRATEGY_VAD_CHUNKED

    def _validate_result(self, result: TranscriptResult) -> None:
        if not result.segments:
            raise InvalidTranscribeResultError("transcript must include segments")

        if not result.full_text.strip():
            raise InvalidTranscribeResultError("transcript full_text is required")
