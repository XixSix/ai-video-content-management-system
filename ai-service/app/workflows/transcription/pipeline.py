from collections.abc import Callable

from app.provider_contracts.asr import AsrPort
from app.provider_contracts.audio_normalizer import AudioNormalizerPort
from app.provider_contracts.diarization import DiarizationPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.vad import VadPort
from app.schemas.transcript import TranscriptResult
from app.schemas.transcription_request import TranscriptionRequest
from app.workflows.transcription.errors import UnsupportedAsrStrategyError
from app.workflows.transcription.pipelines.diarized_turns import (
    run_diarized_turns_pipeline as _run_diarized_turns_pipeline,
)
from app.workflows.transcription.pipelines.vad_chunked import (
    run_vad_chunked_pipeline as _run_vad_chunked_pipeline,
)

PipelineRunner = Callable[..., TranscriptResult]

ASR_STRATEGY_DIARIZED_TURNS = "diarized-turns"
ASR_STRATEGY_VAD_CHUNKED = "vad-chunked"


def select_transcription_pipeline(asr_strategy: str) -> PipelineRunner:
    if asr_strategy == ASR_STRATEGY_DIARIZED_TURNS:
        return _run_diarized_turns_pipeline

    if asr_strategy == ASR_STRATEGY_VAD_CHUNKED:
        return _run_vad_chunked_pipeline

    raise UnsupportedAsrStrategyError(asr_strategy)


def run_transcription_pipeline(
    *,
    asr_strategy: str,
    request: TranscriptionRequest,
    normalizer: AudioNormalizerPort,
    source_separator: SourceSeparationPort,
    vad: VadPort,
    diarizer: DiarizationPort,
    asr: AsrPort,
) -> TranscriptResult:
    pipeline = select_transcription_pipeline(asr_strategy)
    return pipeline(
        request=request,
        normalizer=normalizer,
        source_separator=source_separator,
        vad=vad,
        diarizer=diarizer,
        asr=asr,
    )
