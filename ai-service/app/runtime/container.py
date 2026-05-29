from app.core.config import Settings, get_settings
from app.provider_contracts.asr import AsrPort
from app.providers.asr.faster_whisper_adapter import FasterWhisperAsr
from app.providers.asr.noop_asr import NoopAsr
from app.providers.audio.noop_normalizer import NoopAudioNormalizer
from app.providers.diarization.noop_diarization import NoopDiarization
from app.providers.source_separation.noop_demucs import NoopDemucsSourceSeparator
from app.providers.vad.noop_vad import NoopVad
from app.workflows.transcription.workflow import TranscriptionWorkflow


def build_transcription_workflow(
    settings: Settings | None = None,
) -> TranscriptionWorkflow:
    settings = settings or get_settings()

    return TranscriptionWorkflow(
        normalizer=NoopAudioNormalizer(),
        source_separator=NoopDemucsSourceSeparator(),
        vad=NoopVad(),
        diarizer=NoopDiarization(),
        asr=_build_asr(settings),
    )


def _build_asr(settings: Settings) -> AsrPort:
    if settings.asr_provider == "faster-whisper":
        return FasterWhisperAsr(
            default_language=settings.asr_language,
            model_size=settings.asr_model_size,
            device=settings.asr_device,
            compute_type=settings.asr_compute_type,
            cpu_threads=settings.asr_cpu_threads,
            num_workers=settings.asr_num_workers,
            download_root=settings.asr_model_storage_path,
            local_files_only=settings.asr_local_files_only,
        )

    return NoopAsr(default_language=settings.asr_language)
