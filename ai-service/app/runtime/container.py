from app.core.config import Settings, get_settings
from app.provider_contracts.asr import AsrPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.providers.asr.faster_whisper_adapter import FasterWhisperAsr
from app.providers.asr.noop_asr import NoopAsr
from app.providers.audio.noop_normalizer import NoopAudioNormalizer
from app.providers.chaptering.noop_embedding import NoopTextEmbeddingProvider
from app.providers.diarization.noop_diarization import NoopDiarization
from app.providers.source_separation.noop_demucs import NoopDemucsSourceSeparator
from app.providers.vad.noop_vad import NoopVad
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapteringPipelineConfig,
)
from app.workflows.chaptering.workflow import ChapteringWorkflow
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


def build_chaptering_workflow(
    settings: Settings | None = None,
) -> ChapteringWorkflow:
    settings = settings or get_settings()

    return ChapteringWorkflow(
        embedding=build_chaptering_embedding_provider(settings),
        config=_build_chaptering_pipeline_config(settings),
    )


def build_chaptering_embedding_provider(settings: Settings) -> TextEmbeddingPort:
    _ = settings
    return NoopTextEmbeddingProvider()


def _build_chaptering_pipeline_config(settings: Settings) -> ChapteringPipelineConfig:
    return ChapteringPipelineConfig(
        strategy=settings.chaptering_strategy,
        model_name=settings.chaptering_model_name,
        target_unit_duration_seconds=(settings.chaptering_target_unit_duration_seconds),
        max_unit_duration_seconds=settings.chaptering_max_unit_duration_seconds,
        target_unit_words=settings.chaptering_target_unit_words,
        max_unit_words=settings.chaptering_max_unit_words,
        max_unit_chars=settings.chaptering_max_unit_chars,
        pause_boundary_seconds=settings.chaptering_pause_boundary_seconds,
        punctuation_poor_threshold=settings.chaptering_punctuation_poor_threshold,
        context_window_seconds=settings.chaptering_context_window_seconds,
        scoring=CandidateScoringConfig(
            context_seconds=settings.chaptering_candidate_score_context_seconds,
            long_pause_seconds=settings.chaptering_candidate_long_pause_seconds,
            max_pause_score_seconds=(
                settings.chaptering_candidate_max_pause_score_seconds
            ),
            min_context_text_chars=settings.chaptering_candidate_min_context_text_chars,
            discourse_marker_weight=(
                settings.chaptering_candidate_discourse_marker_weight
            ),
            pause_weight=settings.chaptering_candidate_pause_weight,
            lexical_shift_weight=settings.chaptering_candidate_lexical_shift_weight,
            boundary_quality_weight=(
                settings.chaptering_candidate_boundary_quality_weight
            ),
            duration_sanity_weight=(
                settings.chaptering_candidate_duration_sanity_weight
            ),
        ),
        retention=CandidateRetentionConfig(
            min_limit=settings.chaptering_embedding_candidate_min_limit,
            max_limit=settings.chaptering_embedding_candidate_max_limit,
            multiplier=settings.chaptering_embedding_candidate_multiplier,
            top_score_fraction=settings.chaptering_candidate_top_score_fraction,
        ),
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
