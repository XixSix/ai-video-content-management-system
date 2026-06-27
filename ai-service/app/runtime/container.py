from app.core.config import Settings, get_settings
from app.provider_contracts.audio_decoder import AudioDecoderPort
from app.provider_contracts.chapter_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.chapter_title import ChapterTitleProviderPort
from app.provider_contracts.asr import AsrPort
from app.provider_contracts.diarization import DiarizationPort
from app.provider_contracts.source_separation import SourceSeparationPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.provider_contracts.vad import VadPort
from app.providers.asr.faster_whisper_adapter import FasterWhisperAsr
from app.providers.asr.noop_asr import NoopAsr
from app.providers.audio.noop_decoder import NoopAudioDecoder
from app.providers.audio.audio_preprocessing import AudioPreprocessor
from app.providers.audio.torchaudio_decoder import TorchaudioAudioDecoder
from app.providers.chaptering.noop_embedding import NoopTextEmbeddingProvider
from app.providers.chaptering.sentence_transformer_embedding import (
    SentenceTransformerTextEmbeddingProvider,
)
from app.providers.chaptering.noop_boundary_evaluation import (
    NoopChapterBoundaryEvaluationProvider,
)
from app.providers.chaptering.noop_title import NoopChapterTitleProvider
from app.providers.diarization.noop_diarization import NoopDiarization
from app.providers.diarization.pyannote_community import PyannoteCommunityDiarization
from app.providers.source_separation.demucs import DemucsSourceSeparator
from app.providers.source_separation.noop_demucs import NoopDemucsSourceSeparator
from app.providers.vad.noop_vad import NoopVad
from app.providers.vad.silero_vad import SileroVad
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapteringPipelineConfig,
    UnitRepairConfig,
    ValleyDetectionConfig,
)
from app.workflows.chaptering.workflow import ChapteringWorkflow
from app.workflows.transcription.config import TranscriptionPipelineConfig
from app.workflows.transcription.workflow import TranscriptionWorkflow


def build_transcription_workflow(
    settings: Settings | None = None,
) -> TranscriptionWorkflow:
    settings = settings or get_settings()

    return TranscriptionWorkflow(
        audio_decoder=_build_audio_decoder(settings),
        audio_preprocessor=AudioPreprocessor(settings),
        source_separator=_build_source_separator(settings),
        vad=_build_vad(settings),
        diarizer=_build_diarizer(settings),
        asr=_build_asr(settings),
        config=_build_transcription_pipeline_config(settings),
    )


def build_chaptering_workflow(
    settings: Settings | None = None,
) -> ChapteringWorkflow:
    settings = settings or get_settings()

    return ChapteringWorkflow(
        embedding=build_chaptering_embedding_provider(settings),
        boundary_evaluator=build_chaptering_boundary_evaluation_provider(settings),
        title_provider=build_chaptering_title_provider(settings),
        config=_build_chaptering_pipeline_config(settings),
    )


def build_short_clip_workflow(
    settings: Settings | None = None,
) -> object:
    settings = settings or get_settings()
    _ = settings
    raise NotImplementedError("short clip workflow is not wired in ai-service yet")


def build_chaptering_embedding_provider(settings: Settings) -> TextEmbeddingPort:
    if settings.chaptering_embedding_provider == "sentence-transformers":
        return SentenceTransformerTextEmbeddingProvider(
            model_name=settings.chaptering_embedding_model_name,
            device=settings.chaptering_embedding_device,
            batch_size=settings.chaptering_embedding_batch_size,
            max_sequence_length=(settings.chaptering_embedding_max_sequence_length),
            cache_path=settings.chaptering_embedding_cache_path,
            local_files_only=settings.chaptering_embedding_local_files_only,
        )

    return NoopTextEmbeddingProvider()


def build_chaptering_boundary_evaluation_provider(
    settings: Settings,
) -> ChapterBoundaryEvaluationPort:
    _ = settings
    return NoopChapterBoundaryEvaluationProvider()


def build_chaptering_title_provider(settings: Settings) -> ChapterTitleProviderPort:
    _ = settings
    return NoopChapterTitleProvider()


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
        valley=ValleyDetectionConfig(
            smoothing_radius=settings.chaptering_valley_smoothing_radius,
            peak_window=settings.chaptering_valley_peak_window,
            min_valley_depth=settings.chaptering_valley_min_depth,
            semantic_weight=settings.chaptering_valley_semantic_weight,
        ),
        retention=CandidateRetentionConfig(
            min_limit=settings.chaptering_embedding_candidate_min_limit,
            max_limit=settings.chaptering_embedding_candidate_max_limit,
            multiplier=settings.chaptering_embedding_candidate_multiplier,
            top_score_fraction=settings.chaptering_candidate_top_score_fraction,
        ),
        unit_repair=UnitRepairConfig(
            short_duration_seconds=(
                settings.chaptering_unit_repair_short_duration_seconds
            ),
            min_words=settings.chaptering_unit_repair_min_words,
            fragment_max_words=settings.chaptering_unit_repair_fragment_max_words,
            sparse_duration_seconds=(
                settings.chaptering_unit_repair_sparse_duration_seconds
            ),
            continuation_gap_seconds=(
                settings.chaptering_unit_repair_continuation_gap_seconds
            ),
        ),
    )


def _build_transcription_pipeline_config(
    settings: Settings,
) -> TranscriptionPipelineConfig:
    return TranscriptionPipelineConfig(
        vad_sample_rate=settings.vad_sample_rate,
        vad_min_total_speech_ms=settings.vad_min_total_speech_ms,
        vad_min_speech_ratio=settings.vad_min_speech_ratio,
        offline_asr_pad_seconds=settings.offline_asr_pad_seconds,
        offline_asr_merge_gap_seconds=settings.offline_asr_merge_gap_seconds,
        offline_asr_max_window_seconds=settings.offline_asr_max_window_seconds,
        offline_asr_min_window_seconds=settings.offline_asr_min_window_seconds,
    )


def _build_audio_decoder(settings: Settings) -> AudioDecoderPort:
    if settings.audio_decoder_provider == "torchaudio":
        return TorchaudioAudioDecoder(
            min_sample_rate=settings.audio_min_sample_rate,
            max_sample_rate=settings.audio_max_sample_rate,
            supported_channels=settings.audio_supported_channels,
        )

    return NoopAudioDecoder()


def _build_source_separator(settings: Settings) -> SourceSeparationPort:
    if settings.source_separation_provider == "demucs":
        return DemucsSourceSeparator(
            model_name=settings.demucs_model,
            device=settings.demucs_device,
            output_dir=settings.demucs_output_dir,
            jobs=settings.demucs_jobs,
            shifts=settings.demucs_shifts,
            overlap=settings.demucs_overlap,
        )

    return NoopDemucsSourceSeparator()


def _build_vad(settings: Settings) -> VadPort:
    if settings.vad_provider == "silero":
        return SileroVad(
            sample_rate=settings.vad_sample_rate,
            threshold=settings.vad_threshold,
            min_speech_duration_ms=settings.vad_min_speech_duration_ms,
            min_silence_duration_ms=settings.vad_min_silence_duration_ms,
            speech_pad_ms=settings.vad_speech_pad_ms,
            use_onnx=settings.vad_use_onnx,
        )

    return NoopVad()


def _build_diarizer(settings: Settings) -> DiarizationPort:
    if settings.diarization_provider == "pyannote":
        return PyannoteCommunityDiarization(
            model_name=settings.pyannote_diarization_model,
            auth_token=settings.pyannote_auth_token,
            device=settings.diarization_device,
        )

    return NoopDiarization()


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
