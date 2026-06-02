import logging

from app.core.config import settings
from app.services.ai_service import ai_service_client
from app.pipelines.chaptering.candidates import (
    generate_boundary_candidates,
    retain_candidates_for_embedding,
    score_boundary_candidates,
)
from app.pipelines.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
)
from app.pipelines.chaptering.selection import select_boundaries
from app.pipelines.chaptering.semantic import score_context_windows
from app.pipelines.chaptering.strategies.common import (
    build_chaptering_result,
    media_duration,
)
from app.pipelines.chaptering.units import build_chapter_units
from app.pipelines.chaptering.windows import build_context_windows
from app.schemas.chaptering.output import ChapteringJobOptions
from app.schemas.chaptering.result import (
    ChapteringResult,
    ChapteringTranscript,
)

logger = logging.getLogger(__name__)


def generate_candidate_chapters(
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
) -> ChapteringResult:
    duration = media_duration(transcript)
    logger.info(
        "Starting candidate chaptering transcript_id=%s transcript_version=%s "
        "segments=%s media_duration=%.2f min_duration=%.2f target_duration=%.2f "
        "max_chapters=%s",
        transcript.id,
        transcript.version,
        len(transcript.segments),
        duration,
        options.min_chapter_duration,
        options.target_chapter_duration,
        options.max_chapters,
    )
    units = build_chapter_units(
        transcript.segments,
        max_unit_duration=settings.chaptering_max_unit_duration_seconds,
        pause_boundary_seconds=settings.chaptering_pause_boundary_seconds,
    )
    logger.info(
        "Chaptering units built transcript_id=%s units=%s max_unit_duration=%.2f "
        "pause_boundary_seconds=%.2f",
        transcript.id,
        len(units),
        settings.chaptering_max_unit_duration_seconds,
        settings.chaptering_pause_boundary_seconds,
    )
    raw_candidates = generate_boundary_candidates(
        units,
        media_duration=duration,
        min_chapter_duration=options.min_chapter_duration,
    )
    scored_candidates = score_boundary_candidates(
        units,
        raw_candidates,
        media_duration=duration,
        min_chapter_duration=options.min_chapter_duration,
        config=_candidate_scoring_config(),
    )
    candidates = retain_candidates_for_embedding(
        scored_candidates,
        media_duration=duration,
        target_chapter_duration=options.target_chapter_duration,
        config=_candidate_retention_config(),
    )
    windows = build_context_windows(
        units,
        candidates,
        context_duration=settings.chaptering_context_window_seconds,
    )
    logger.info(
        "Chaptering context windows built transcript_id=%s candidates=%s "
        "windows=%s context_duration=%.2f",
        transcript.id,
        len(candidates),
        len(windows),
        settings.chaptering_context_window_seconds,
    )
    # logger.info(
    #     "Calling ai-service for chaptering embeddings transcript_id=%s windows=%s "
    #     "note=%s",
    #     transcript.id,
    #     len(windows),
    #     "embeddings score candidate boundaries but do not change source from RULE_BASED",
    # )
    semantic_shift_scores_by_time = score_context_windows(
        windows,
        embedding_client=ai_service_client,
        request_id_prefix=f"chaptering:{transcript.id}:{transcript.version}",
    )
    logger.info(
        "Chaptering semantic scores generated transcript_id=%s windows=%s scores=%s",
        transcript.id,
        len(windows),
        len(semantic_shift_scores_by_time),
    )
    boundaries = select_boundaries(
        transcript.segments,
        media_duration=duration,
        min_duration=options.min_chapter_duration,
        target_duration=options.target_chapter_duration,
        max_chapters=options.max_chapters,
        candidate_times=[window.candidate_time for window in windows],
    )
    logger.info(
        "Chaptering boundaries selected transcript_id=%s boundary_count=%s "
        "boundaries=%s",
        transcript.id,
        len(boundaries),
        _format_times(boundaries),
    )
    result = build_chaptering_result(
        transcript,
        options,
        duration,
        boundaries,
        semantic_shift_scores_by_time=semantic_shift_scores_by_time,
    )
    logger.info(
        "Candidate chaptering output transcript_id=%s source=%s model=%s chapters=%s "
        "semantic_scores_attached=%s",
        transcript.id,
        result.source,
        result.model,
        len(result.chapters),
        bool(semantic_shift_scores_by_time),
    )
    return result


def _format_times(times: list[float]) -> list[float]:
    return [round(time, 2) for time in times]


def _candidate_scoring_config() -> CandidateScoringConfig:
    return CandidateScoringConfig(
        context_seconds=settings.chaptering_candidate_score_context_seconds,
        long_pause_seconds=settings.chaptering_candidate_long_pause_seconds,
        max_pause_score_seconds=settings.chaptering_candidate_max_pause_score_seconds,
        min_context_text_chars=settings.chaptering_candidate_min_context_text_chars,
        discourse_marker_weight=settings.chaptering_candidate_discourse_marker_weight,
        pause_weight=settings.chaptering_candidate_pause_weight,
        lexical_shift_weight=settings.chaptering_candidate_lexical_shift_weight,
        boundary_quality_weight=settings.chaptering_candidate_boundary_quality_weight,
        duration_sanity_weight=settings.chaptering_candidate_duration_sanity_weight,
    )


def _candidate_retention_config() -> CandidateRetentionConfig:
    return CandidateRetentionConfig(
        min_limit=settings.chaptering_embedding_candidate_min_limit,
        max_limit=settings.chaptering_embedding_candidate_max_limit,
        multiplier=settings.chaptering_embedding_candidate_multiplier,
        top_score_fraction=settings.chaptering_candidate_top_score_fraction,
    )
