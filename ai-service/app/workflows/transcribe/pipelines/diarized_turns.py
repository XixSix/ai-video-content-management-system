from pathlib import Path

from app.provider_contracts.asr import AsrPort
from app.provider_contracts.audio_decoder import AudioDecoderPort
from app.provider_contracts.audio_preprocessing import AudioPreprocessorPort
from app.provider_contracts.diarization import DiarizationPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.vad import VadPort
from app.schemas.transcript import TranscriptResult
from app.schemas.transcribe import TranscribeRequest
from app.workflows.transcribe.config import TranscribePipelineConfig
from app.workflows.transcribe.planning import plan_diarized_asr_windows
from app.workflows.transcribe.speech_gate import speech_regions_pass_gate
from app.workflows.transcribe.pipelines.vad_chunked import (
    run_vad_chunked_pipeline,
    transcribe_asr_windows,
)


def run_diarized_turns_pipeline(
    *,
    request: TranscribeRequest,
    audio_decoder: AudioDecoderPort,
    audio_preprocessor: AudioPreprocessorPort,
    source_separator: SourceSeparationPort,
    vad: VadPort,
    diarizer: DiarizationPort,
    asr: AsrPort,
    config: TranscribePipelineConfig,
) -> TranscriptResult:
    audio_path = request.local_path
    source_separation_model = ""

    if request.options.enable_source_separation:
        audio_path = source_separator.separate(audio_path)
        source_separation_model = source_separator.model_name

    audio = audio_preprocessor.preprocess(
        audio=audio_decoder.decode(audio_path),
        target_sample_rate=config.vad_sample_rate,
    )
    if not audio.samples:
        return _run_vad_fallback(
            request=request,
            local_path=audio_path,
            source_separation_model=source_separation_model,
            audio_decoder=audio_decoder,
            audio_preprocessor=audio_preprocessor,
            source_separator=source_separator,
            vad=vad,
            diarizer=diarizer,
            asr=asr,
            config=config,
        )

    analysis = diarizer.analyze_offline_audio(audio)
    if not speech_regions_pass_gate(
        regions=analysis.speech_regions,
        audio_sample_count=len(audio.samples),
        sample_rate=audio.sample_rate,
        min_total_speech_ms=config.vad_min_total_speech_ms,
        min_speech_ratio=config.vad_min_speech_ratio,
    ):
        return _run_vad_fallback(
            request=request,
            local_path=audio_path,
            source_separation_model=source_separation_model,
            audio_decoder=audio_decoder,
            audio_preprocessor=audio_preprocessor,
            source_separator=source_separator,
            vad=vad,
            diarizer=diarizer,
            asr=asr,
            config=config,
        )

    windows = plan_diarized_asr_windows(
        analysis.turns,
        total_samples=len(audio.samples),
        sample_rate=audio.sample_rate,
        merge_gap_seconds=config.offline_asr_merge_gap_seconds,
        max_window_seconds=config.offline_asr_max_window_seconds,
        min_window_seconds=config.offline_asr_min_window_seconds,
    )
    if not windows:
        return _run_vad_fallback(
            request=request,
            local_path=audio_path,
            source_separation_model=source_separation_model,
            audio_decoder=audio_decoder,
            audio_preprocessor=audio_preprocessor,
            source_separator=source_separator,
            vad=vad,
            diarizer=diarizer,
            asr=asr,
            config=config,
        )

    result = transcribe_asr_windows(
        asr=asr,
        windows=windows,
        samples=audio.samples,
        sample_rate=audio.sample_rate,
        language=request.options.language,
        enable_word_timestamps=request.options.enable_word_timestamps,
    ).model_copy(update={"diarization_model": diarizer.model_name})

    if source_separation_model:
        return result.model_copy(
            update={"source_separation_model": source_separation_model}
        )

    return result


def _run_vad_fallback(
    *,
    request: TranscribeRequest,
    local_path: Path,
    source_separation_model: str,
    audio_decoder: AudioDecoderPort,
    audio_preprocessor: AudioPreprocessorPort,
    source_separator: SourceSeparationPort,
    vad: VadPort,
    diarizer: DiarizationPort,
    asr: AsrPort,
    config: TranscribePipelineConfig,
) -> TranscriptResult:
    fallback_request = request.model_copy(
        update={
            "local_path": local_path,
            "options": request.options.model_copy(
                update={"enable_source_separation": False}
            ),
        }
    )
    result = run_vad_chunked_pipeline(
        request=fallback_request,
        audio_decoder=audio_decoder,
        audio_preprocessor=audio_preprocessor,
        source_separator=source_separator,
        vad=vad,
        diarizer=diarizer,
        asr=asr,
        config=config,
    )
    if source_separation_model:
        return result.model_copy(
            update={"source_separation_model": source_separation_model}
        )

    return result
