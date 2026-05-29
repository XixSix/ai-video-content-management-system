from app.provider_contracts.asr import AsrPort
from app.provider_contracts.audio_normalizer import AudioNormalizerPort
from app.provider_contracts.diarization import DiarizationPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.vad import VadPort
from app.schemas.transcript import TranscriptResult
from app.schemas.transcription_request import TranscriptionRequest


def run_vad_chunked_pipeline(
    *,
    request: TranscriptionRequest,
    normalizer: AudioNormalizerPort,
    source_separator: SourceSeparationPort,
    vad: VadPort,
    diarizer: DiarizationPort,
    asr: AsrPort,
) -> TranscriptResult:
    audio_path = normalizer.normalize(request.local_path)

    if request.options.enable_source_separation:
        audio_path = source_separator.separate(audio_path)

    # TODO: split audio by VAD chunks before ASR.
    if request.options.enable_vad:
        audio_path = vad.apply(audio_path)

    return asr.transcribe(
        local_path=audio_path,
        language=request.options.language,
    )
