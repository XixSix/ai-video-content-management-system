from app.core.config import Settings, get_settings
from app.provider_contracts.audio_decoder import AudioDecoderPort
from app.provider_contracts.generate_chapters_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.generate_chapters_title import ChapterTitleProviderPort
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
from app.providers.generate_chapters.noop_embedding import NoopTextEmbeddingProvider
from app.providers.generate_chapters.sentence_transformer_embedding import (
    SentenceTransformerTextEmbeddingProvider,
)
from app.providers.generate_chapters.noop_boundary_evaluation import (
    NoopChapterBoundaryEvaluationProvider,
)
from app.providers.generate_chapters.noop_title import NoopChapterTitleProvider
from app.providers.generate_chapters.openai_compatible_boundary_evaluation import (
    OpenAICompatibleChapterBoundaryEvaluationProvider,
)
from app.providers.generate_chapters.openai_compatible_title import (
    OpenAICompatibleChapterTitleProvider,
)
from app.providers.diarization.noop_diarization import NoopDiarization
from app.providers.diarization.pyannote_community import PyannoteCommunityDiarization
from app.providers.llm.openai_compatible import OpenAICompatibleChatClient
from app.providers.generate_short_clips.openai_compatible_candidate import (
    OpenAICompatibleGenerateShortClipsCandidateProvider,
)
from app.providers.generate_short_clips.noop_candidate import (
    NoopGenerateShortClipsCandidateProvider,
)
from app.providers.source_separation.demucs import DemucsSourceSeparator
from app.providers.source_separation.noop_demucs import NoopDemucsSourceSeparator
from app.providers.vad.noop_vad import NoopVad
from app.providers.vad.silero_vad import SileroVad
from app.workflows.generate_short_clips.workflow import GenerateShortClipsWorkflow
from app.workflows.generate_chapters.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    GenerateChaptersPipelineConfig,
    UnitRepairConfig,
    ValleyDetectionConfig,
)
from app.workflows.generate_chapters.workflow import GenerateChaptersWorkflow
from app.workflows.transcribe.config import TranscribePipelineConfig
from app.workflows.transcribe.workflow import TranscribeWorkflow


def build_transcribe_workflow(
    settings: Settings | None = None,
) -> TranscribeWorkflow:
    settings = settings or get_settings()

    return TranscribeWorkflow(
        audio_decoder=_build_audio_decoder(settings),
        audio_preprocessor=AudioPreprocessor(settings),
        source_separator=_build_source_separator(settings),
        vad=_build_vad(settings),
        diarizer=_build_diarizer(settings),
        asr=_build_asr(settings),
        config=_build_transcribe_pipeline_config(settings),
    )


def build_generate_chapters_workflow(
    settings: Settings | None = None,
) -> GenerateChaptersWorkflow:
    settings = settings or get_settings()
    llm_client = (
        build_llm_chat_client(settings)
        if _generate_chapters_uses_llm(settings)
        else None
    )

    return GenerateChaptersWorkflow(
        embedding=build_generate_chapters_embedding_provider(settings),
        boundary_evaluator=build_generate_chapters_boundary_evaluation_provider(
            settings,
            llm_client=llm_client,
        ),
        title_provider=build_generate_chapters_title_provider(
            settings,
            llm_client=llm_client,
        ),
        config=_build_generate_chapters_pipeline_config(settings),
    )


def build_generate_short_clips_workflow(
    settings: Settings | None = None,
) -> GenerateShortClipsWorkflow:
    settings = settings or get_settings()
    llm_client = (
        build_llm_chat_client(settings)
        if settings.generate_short_clips_candidate_provider == "openai-compatible"
        else None
    )

    return GenerateShortClipsWorkflow(
        candidate_provider=build_generate_short_clips_candidate_provider(
            settings,
            llm_client=llm_client,
        ),
        fallback_candidate_provider=(
            NoopGenerateShortClipsCandidateProvider(
                model_name=settings.generate_short_clips_model_name,
            )
            if settings.generate_short_clips_candidate_provider == "openai-compatible"
            else None
        ),
    )


def build_generate_short_clips_candidate_provider(
    settings: Settings,
    *,
    llm_client: OpenAICompatibleChatClient | None = None,
) -> (
    NoopGenerateShortClipsCandidateProvider
    | OpenAICompatibleGenerateShortClipsCandidateProvider
):
    if settings.generate_short_clips_candidate_provider == "openai-compatible":
        return OpenAICompatibleGenerateShortClipsCandidateProvider(
            chat_client=llm_client or build_llm_chat_client(settings),
        )

    return NoopGenerateShortClipsCandidateProvider(
        model_name=settings.generate_short_clips_model_name,
    )


def build_llm_chat_client(settings: Settings) -> OpenAICompatibleChatClient:
    return OpenAICompatibleChatClient(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model_name=settings.llm_model_name,
        timeout_seconds=settings.llm_timeout_seconds,
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
    )


def build_generate_chapters_embedding_provider(settings: Settings) -> TextEmbeddingPort:
    if settings.generate_chapters_embedding_provider == "sentence-transformers":
        return SentenceTransformerTextEmbeddingProvider(
            model_name=settings.generate_chapters_embedding_model_name,
            device=settings.generate_chapters_embedding_device,
            batch_size=settings.generate_chapters_embedding_batch_size,
            max_sequence_length=(
                settings.generate_chapters_embedding_max_sequence_length
            ),
            cache_path=settings.generate_chapters_embedding_cache_path,
            local_files_only=settings.generate_chapters_embedding_local_files_only,
        )

    return NoopTextEmbeddingProvider()


def build_generate_chapters_boundary_evaluation_provider(
    settings: Settings,
    *,
    llm_client: OpenAICompatibleChatClient | None = None,
) -> ChapterBoundaryEvaluationPort:
    if settings.generate_chapters_boundary_evaluation_provider == "openai-compatible":
        return OpenAICompatibleChapterBoundaryEvaluationProvider(
            chat_client=llm_client or build_llm_chat_client(settings),
        )

    return NoopChapterBoundaryEvaluationProvider()


def build_generate_chapters_title_provider(
    settings: Settings,
    *,
    llm_client: OpenAICompatibleChatClient | None = None,
) -> ChapterTitleProviderPort:
    if settings.generate_chapters_title_provider == "openai-compatible":
        return OpenAICompatibleChapterTitleProvider(
            chat_client=llm_client or build_llm_chat_client(settings),
        )

    return NoopChapterTitleProvider()


def _generate_chapters_uses_llm(settings: Settings) -> bool:
    return (
        settings.generate_chapters_boundary_evaluation_provider == "openai-compatible"
        or settings.generate_chapters_title_provider == "openai-compatible"
    )


def _build_generate_chapters_pipeline_config(
    settings: Settings,
) -> GenerateChaptersPipelineConfig:
    return GenerateChaptersPipelineConfig(
        strategy=settings.generate_chapters_strategy,
        model_name=settings.generate_chapters_model_name,
        target_unit_duration_seconds=(
            settings.generate_chapters_target_unit_duration_seconds
        ),
        max_unit_duration_seconds=settings.generate_chapters_max_unit_duration_seconds,
        target_unit_words=settings.generate_chapters_target_unit_words,
        max_unit_words=settings.generate_chapters_max_unit_words,
        max_unit_chars=settings.generate_chapters_max_unit_chars,
        pause_boundary_seconds=settings.generate_chapters_pause_boundary_seconds,
        punctuation_poor_threshold=settings.generate_chapters_punctuation_poor_threshold,
        context_window_seconds=settings.generate_chapters_context_window_seconds,
        scoring=CandidateScoringConfig(
            context_seconds=settings.generate_chapters_candidate_score_context_seconds,
            long_pause_seconds=settings.generate_chapters_candidate_long_pause_seconds,
            max_pause_score_seconds=(
                settings.generate_chapters_candidate_max_pause_score_seconds
            ),
            min_context_text_chars=settings.generate_chapters_candidate_min_context_text_chars,
            discourse_marker_weight=(
                settings.generate_chapters_candidate_discourse_marker_weight
            ),
            pause_weight=settings.generate_chapters_candidate_pause_weight,
            lexical_shift_weight=settings.generate_chapters_candidate_lexical_shift_weight,
            boundary_quality_weight=(
                settings.generate_chapters_candidate_boundary_quality_weight
            ),
            duration_sanity_weight=(
                settings.generate_chapters_candidate_duration_sanity_weight
            ),
        ),
        valley=ValleyDetectionConfig(
            smoothing_radius=settings.generate_chapters_valley_smoothing_radius,
            peak_window=settings.generate_chapters_valley_peak_window,
            min_valley_depth=settings.generate_chapters_valley_min_depth,
            semantic_weight=settings.generate_chapters_valley_semantic_weight,
        ),
        retention=CandidateRetentionConfig(
            min_limit=settings.generate_chapters_embedding_candidate_min_limit,
            max_limit=settings.generate_chapters_embedding_candidate_max_limit,
            multiplier=settings.generate_chapters_embedding_candidate_multiplier,
            top_score_fraction=settings.generate_chapters_candidate_top_score_fraction,
        ),
        unit_repair=UnitRepairConfig(
            short_duration_seconds=(
                settings.generate_chapters_unit_repair_short_duration_seconds
            ),
            min_words=settings.generate_chapters_unit_repair_min_words,
            fragment_max_words=settings.generate_chapters_unit_repair_fragment_max_words,
            sparse_duration_seconds=(
                settings.generate_chapters_unit_repair_sparse_duration_seconds
            ),
            continuation_gap_seconds=(
                settings.generate_chapters_unit_repair_continuation_gap_seconds
            ),
        ),
    )


def _build_transcribe_pipeline_config(
    settings: Settings,
) -> TranscribePipelineConfig:
    return TranscribePipelineConfig(
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
