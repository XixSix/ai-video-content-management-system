from app.provider_contracts.chapter_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.chapter_title import ChapterTitleProviderPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.candidate_ranking import rank_boundary_candidates
from app.workflows.chaptering.candidates import (
    retain_candidates_for_embedding,
)
from app.workflows.chaptering.common import build_chapters, media_duration
from app.workflows.chaptering.llm_evaluation import apply_boundary_evaluations
from app.workflows.chaptering.scores.gap_scoring import (
    attach_semantic_shift_scores,
    gap_scores_to_candidates,
    score_unit_gaps,
)
from app.workflows.chaptering.schemas import ChapterUnit, ChapteringPipelineConfig
from app.workflows.chaptering.selection import select_boundaries_from_candidates
from app.workflows.chaptering.semantic import score_context_windows
from app.workflows.chaptering.scores.valleys import detect_valley_candidates
from app.workflows.chaptering.title_generation import apply_generated_titles
from app.workflows.chaptering.unit_repair import repair_micro_units
from app.workflows.chaptering.windows import build_context_windows


def run_units_pipeline(
    *,
    request: ChapterGenerationRequest,
    units: list[ChapterUnit],
    embedding: TextEmbeddingPort,
    boundary_evaluator: ChapterBoundaryEvaluationPort,
    title_provider: ChapterTitleProviderPort,
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
    units = repair_micro_units(
        units,
        max_unit_duration=config.max_unit_duration_seconds,
        max_unit_words=config.max_unit_words,
        max_unit_chars=config.max_unit_chars,
        config=config.unit_repair,
    )

    gap_scores = score_unit_gaps(
        units,
        media_duration=duration,
        min_chapter_duration=options.min_chapter_duration_seconds,
        config=config.scoring,
    )
    all_gap_candidates = gap_scores_to_candidates(gap_scores)
    all_gap_windows = build_context_windows(
        units,
        all_gap_candidates,
        context_duration=config.context_window_seconds,
    )
    semantic_shift_scores_by_time = (
        score_context_windows(all_gap_windows, embedding=embedding)
        if options.use_embeddings and all_gap_windows
        else {}
    )
    gap_scores = attach_semantic_shift_scores(gap_scores, semantic_shift_scores_by_time)
    valley_gap_scores = detect_valley_candidates(
        gap_scores,
        min_candidate_distance_seconds=options.min_chapter_duration_seconds / 2,
        config=config.valley,
    )
    candidate_gap_scores = valley_gap_scores or gap_scores
    scored_candidates = gap_scores_to_candidates(candidate_gap_scores)
    retained_candidates = retain_candidates_for_embedding(
        scored_candidates,
        media_duration=duration,
        target_chapter_duration=options.target_chapter_duration_seconds,
        config=config.retention,
    )
    ranked_candidates = rank_boundary_candidates(
        retained_candidates,
        semantic_shift_scores_by_time=semantic_shift_scores_by_time,
        max_chapters=options.max_chapters,
        min_candidate_distance_seconds=options.min_chapter_duration_seconds / 2,
        config=config.retention,
    )
    llm_applied = False
    if options.use_llm and ranked_candidates:
        llm_windows = build_context_windows(
            units,
            ranked_candidates,
            context_duration=config.context_window_seconds,
        )
        ranked_candidates, llm_applied = apply_boundary_evaluations(
            ranked_candidates,
            llm_windows,
            provider=boundary_evaluator,
        )

    boundaries = select_boundaries_from_candidates(
        ranked_candidates,
        media_duration=duration,
        min_duration=options.min_chapter_duration_seconds,
        target_duration=options.target_chapter_duration_seconds,
        max_duration=options.max_chapter_duration_seconds,
        max_chapters=options.max_chapters,
    )
    candidates_by_time = {candidate.time: candidate for candidate in ranked_candidates}
    chapters = build_chapters(
        request,
        duration=duration,
        boundaries=boundaries,
        semantic_shift_scores_by_time=semantic_shift_scores_by_time,
        candidates_by_time=candidates_by_time,
    )
    titles_applied = False
    if options.use_llm:
        chapters, titles_applied = apply_generated_titles(
            chapters,
            request,
            provider=title_provider,
        )

    return ChapterGenerationResult(
        request_id=request.request_id,
        language=request.language,
        model=config.model_name,
        source="LLM" if llm_applied or titles_applied else "RULE_BASED",
        chapters=chapters,
    )
