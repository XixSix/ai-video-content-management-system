from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.candidates import (
    generate_boundary_candidates,
    retain_candidates_for_embedding,
    score_boundary_candidates,
)
from app.workflows.chaptering.common import build_chapters, media_duration
from app.workflows.chaptering.schemas import ChapterUnit, ChapteringPipelineConfig
from app.workflows.chaptering.selection import select_boundaries
from app.workflows.chaptering.semantic import score_context_windows
from app.workflows.chaptering.windows import build_context_windows


def run_units_pipeline(
    *,
    request: ChapterGenerationRequest,
    units: list[ChapterUnit],
    embedding: TextEmbeddingPort,
    config: ChapteringPipelineConfig,
) -> ChapterGenerationResult:
    """Generate chapters from prebuilt timeline units.

    Segment and word strategies only differ in how they create `ChapterUnit`
    values. Candidate generation, cheap scoring, embedding scoring, boundary
    selection, and chapter construction stay shared so both strategies evolve
    through the same downstream behavior.
    """
    duration = media_duration(request)
    options = request.options

    raw_candidates = generate_boundary_candidates(
        units,
        media_duration=duration,
        min_chapter_duration=options.min_chapter_duration_seconds,
    )
    scored_candidates = score_boundary_candidates(
        units,
        raw_candidates,
        media_duration=duration,
        min_chapter_duration=options.min_chapter_duration_seconds,
        config=config.scoring,
    )
    retained_candidates = retain_candidates_for_embedding(
        scored_candidates,
        media_duration=duration,
        target_chapter_duration=options.target_chapter_duration_seconds,
        config=config.retention,
    )
    windows = build_context_windows(
        units,
        retained_candidates,
        context_duration=config.context_window_seconds,
    )
    semantic_shift_scores_by_time = (
        score_context_windows(windows, embedding=embedding)
        if options.use_embeddings and windows
        else {}
    )
    candidate_times = [window.candidate_time for window in windows] or [
        candidate.time for candidate in retained_candidates
    ]
    boundaries = select_boundaries(
        request.segments,
        media_duration=duration,
        min_duration=options.min_chapter_duration_seconds,
        target_duration=options.target_chapter_duration_seconds,
        max_chapters=options.max_chapters,
        candidate_times=candidate_times,
    )
    candidates_by_time = {candidate.time: candidate for candidate in scored_candidates}

    return ChapterGenerationResult(
        request_id=request.request_id,
        language=request.language,
        model=config.model_name,
        source="RULE_BASED",
        chapters=build_chapters(
            request,
            duration=duration,
            boundaries=boundaries,
            semantic_shift_scores_by_time=semantic_shift_scores_by_time,
            candidates_by_time=candidates_by_time,
        ),
    )
