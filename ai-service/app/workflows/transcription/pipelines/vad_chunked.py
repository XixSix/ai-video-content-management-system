from app.provider_contracts.asr import AsrPort
from app.provider_contracts.audio_decoder import AudioDecoderPort
from app.provider_contracts.audio_preprocessing import AudioPreprocessorPort
from app.provider_contracts.diarization import DiarizationPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.vad import VadPort
from app.schemas.transcript import TranscriptResult, TranscriptSegmentResult
from app.schemas.transcription_request import TranscriptionRequest
from app.workflows.transcription.config import TranscriptionPipelineConfig
from app.workflows.transcription.errors import InvalidTranscriptResultError
from app.workflows.transcription.planning import OfflineAsrWindow, plan_vad_asr_windows
from app.workflows.transcription.speech_gate import speech_regions_pass_gate


def run_vad_chunked_pipeline(
    *,
    request: TranscriptionRequest,
    audio_decoder: AudioDecoderPort,
    audio_preprocessor: AudioPreprocessorPort,
    source_separator: SourceSeparationPort,
    vad: VadPort,
    diarizer: DiarizationPort,
    asr: AsrPort,
    config: TranscriptionPipelineConfig,
) -> TranscriptResult:
    _ = diarizer
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
        raise InvalidTranscriptResultError("audio must include decoded samples")

    if request.options.enable_vad:
        speech_regions = vad.detect_speech_regions(audio)
        if not speech_regions_pass_gate(
            regions=speech_regions,
            audio_sample_count=len(audio.samples),
            sample_rate=audio.sample_rate,
            min_total_speech_ms=config.vad_min_total_speech_ms,
            min_speech_ratio=config.vad_min_speech_ratio,
        ):
            raise InvalidTranscriptResultError("audio does not contain enough speech")

        windows = plan_vad_asr_windows(
            speech_regions,
            total_samples=len(audio.samples),
            sample_rate=audio.sample_rate,
            pad_seconds=config.offline_asr_pad_seconds,
            merge_gap_seconds=config.offline_asr_merge_gap_seconds,
            max_window_seconds=config.offline_asr_max_window_seconds,
            min_window_seconds=config.offline_asr_min_window_seconds,
        )
    else:
        windows = [OfflineAsrWindow(start_sample=0, end_sample=len(audio.samples))]

    result = transcribe_asr_windows(
        asr=asr,
        windows=windows,
        samples=audio.samples,
        sample_rate=audio.sample_rate,
        language=request.options.language,
    )
    if source_separation_model:
        return result.model_copy(
            update={"source_separation_model": source_separation_model}
        )

    return result


def transcribe_asr_windows(
    *,
    asr: AsrPort,
    windows: list[OfflineAsrWindow],
    samples: tuple[float, ...],
    sample_rate: int,
    language: str | None,
) -> TranscriptResult:
    segments: list[TranscriptSegmentResult] = []
    full_text_parts: list[str] = []
    detected_language = language or ""
    asr_model = asr.model_name

    for window in windows:
        window_result = asr.transcribe_audio(
            samples=samples[window.start_sample : window.end_sample],
            sample_rate=sample_rate,
            language=language,
        )
        if not detected_language:
            detected_language = window_result.language
        if not asr_model:
            asr_model = window_result.asr_model
        if window_result.full_text.strip():
            full_text_parts.append(window_result.full_text.strip())

        offset_seconds = window.start_sample / sample_rate
        for segment in window_result.segments:
            segments.append(
                TranscriptSegmentResult(
                    segment_id=f"seg-{len(segments) + 1:04d}",
                    start_seconds=segment.start_seconds + offset_seconds,
                    end_seconds=segment.end_seconds + offset_seconds,
                    text=segment.text,
                )
            )

    return TranscriptResult(
        language=detected_language or language or "",
        full_text=" ".join(full_text_parts),
        segments=segments,
        asr_model=asr_model,
    )
