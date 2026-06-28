from app.provider_contracts.chapter_boundary_evaluation import (
    ChapterBoundaryEvaluationPort,
)
from app.provider_contracts.chapter_title import ChapterTitleProviderPort
from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.candidate_ranking import (
    prepare_boundary_candidates_for_review,
    rank_final_boundary_candidates,
)
from app.workflows.chaptering.common import build_chapters, media_duration
from app.workflows.chaptering.llm_evaluation import apply_boundary_evaluations
from app.workflows.chaptering.scores.gap_scoring import (
    attach_semantic_shift_scores,
    gap_scores_to_candidates,
    score_unit_gaps,
)
from app.workflows.chaptering.schemas import (
    ChapterGapScore,
    ChapterUnit,
    ChapteringPipelineConfig,
)
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
        pause_boundary_seconds=config.pause_boundary_seconds,
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
    candidate_gap_scores = (
        _merge_valley_gap_scores(gap_scores, valley_gap_scores)
        if valley_gap_scores
        else gap_scores
    )
    scored_candidates = gap_scores_to_candidates(candidate_gap_scores)
    review_candidates = prepare_boundary_candidates_for_review(
        scored_candidates,
        max_chapters=options.max_chapters,
        min_candidate_distance_seconds=options.min_chapter_duration_seconds / 2,
        config=config.retention,
    )
    llm_applied = False
    if options.use_llm and review_candidates:
        llm_windows = build_context_windows(
            units,
            review_candidates,
            context_duration=config.context_window_seconds,
        )
        review_candidates, llm_applied = apply_boundary_evaluations(
            review_candidates,
            llm_windows,
            provider=boundary_evaluator,
        )
    final_candidates = rank_final_boundary_candidates(review_candidates)

    boundaries = select_boundaries_from_candidates(
        final_candidates,
        media_duration=duration,
        min_duration=options.min_chapter_duration_seconds,
        target_duration=options.target_chapter_duration_seconds,
        max_duration=options.max_chapter_duration_seconds,
        max_chapters=options.max_chapters,
    )
    candidates_by_time = {candidate.time: candidate for candidate in final_candidates}
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


def _merge_valley_gap_scores(
    gap_scores: list[ChapterGapScore],
    valley_gap_scores: list[ChapterGapScore],
) -> list[ChapterGapScore]:
    """Return all gap scores with valley metadata attached where available.

    Valley detection should highlight strong topic-shift candidates, but it
    must not remove timeline coverage. Boundary selection can only choose from
    retained candidate times, so replacing the full gap list with sparse
    valleys can leave no legal candidate inside max chapter duration.
    """
    valleys_by_time = {gap_score.time: gap_score for gap_score in valley_gap_scores}
    return [
        valleys_by_time.get(gap_score.time, gap_score)
        for gap_score in gap_scores
    ]
