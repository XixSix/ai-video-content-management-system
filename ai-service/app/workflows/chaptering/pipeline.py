from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import (
    ChapterBoundaryScores,
    ChapterGenerationRequest,
    ChapterGenerationResult,
    GeneratedChapter,
)
from app.workflows.chaptering.candidates import (
    generate_boundary_candidates,
    retain_candidates_for_embedding,
    score_boundary_candidates,
)
from app.workflows.chaptering.errors import ChapterGenerationInputError
from app.workflows.chaptering.schemas import (
    ChapterBoundaryCandidate,
    ChapteringPipelineConfig,
)
from app.workflows.chaptering.scoring import score_boundary
from app.workflows.chaptering.selection import select_boundaries
from app.workflows.chaptering.semantic import score_context_windows
from app.workflows.chaptering.titles import chapter_summary, chapter_text, chapter_title
from app.workflows.chaptering.units import build_chapter_units
from app.workflows.chaptering.windows import build_context_windows

def run_chapter_generation_pipeline(
    *,
    request: ChapterGenerationRequest,
    embedding: TextEmbeddingPort,
    config: ChapteringPipelineConfig,
) -> ChapterGenerationResult:
    """Generate deterministic chapters from transcript segments.

    The first moved implementation mirrors the worker fallback/candidate
    pipeline: validate input, build stable transcript units, generate and score
    candidate boundaries, optionally attach embedding semantic shift scores,
    select constrained chapter starts, then produce fallback titles and
    summaries. It does not call an LLM or persist data.
    """
    _validate_request(request)
    duration = _media_duration(request)
    options = request.options

    units = build_chapter_units(
        request.segments,
        max_unit_duration=config.max_unit_duration_seconds,
        pause_boundary_seconds=config.pause_boundary_seconds,
    )
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
        chapters=_build_chapters(
            request,
            duration=duration,
            boundaries=boundaries,
            semantic_shift_scores_by_time=semantic_shift_scores_by_time,
            candidates_by_time=candidates_by_time,
        ),
    )


def _validate_request(request: ChapterGenerationRequest) -> None:
    """Reject empty, unsorted, or invalid transcript inputs."""
    if not request.segments:
        raise ChapterGenerationInputError("transcript must include segments")

    has_text = False
    previous_start = -1.0
    media_duration = request.media_duration_seconds

    for segment in request.segments:
        if segment.start_seconds >= segment.end_seconds:
            raise ChapterGenerationInputError(
                "segment start_seconds must be before end_seconds"
            )
        if segment.start_seconds < previous_start:
            raise ChapterGenerationInputError("segments must be sorted by timestamp")
        if media_duration is not None and segment.end_seconds > media_duration + 1.0:
            raise ChapterGenerationInputError("segment exceeds media duration")

        has_text = has_text or bool(segment.text.strip())
        previous_start = segment.start_seconds

    if not has_text:
        raise ChapterGenerationInputError("transcript text is empty")


def _media_duration(request: ChapterGenerationRequest) -> float:
    """Return supplied media duration or infer it from the last segment end."""
    if request.media_duration_seconds is not None and request.media_duration_seconds > 0:
        return request.media_duration_seconds

    if not request.segments:
        raise ChapterGenerationInputError("transcript must include segments")

    return max(segment.end_seconds for segment in request.segments)


def _build_chapters(
    request: ChapterGenerationRequest,
    *,
    duration: float,
    boundaries: list[float],
    semantic_shift_scores_by_time: dict[float, float],
    candidates_by_time: dict[float, ChapterBoundaryCandidate],
) -> list[GeneratedChapter]:
    """Build chapter DTOs and attach deterministic score metadata."""
    chapters: list[GeneratedChapter] = []

    for index, start_time in enumerate(boundaries, start=1):
        end_time = boundaries[index] if index < len(boundaries) else duration
        chapter_segments = _segments_in_range(request, start_time, end_time)
        text = chapter_text(chapter_segments)
        base_scores = score_boundary(
            request.segments,
            start_time=start_time,
            previous_start=boundaries[index - 2] if index > 1 else 0.0,
            target_duration=request.options.target_chapter_duration_seconds,
            semantic_shift=semantic_shift_scores_by_time.get(start_time, 0.0),
        )
        scores = _merge_candidate_scores(
            base_scores,
            candidates_by_time.get(start_time),
        )
        chapters.append(
            GeneratedChapter(
                index=index,
                start_seconds=start_time,
                end_seconds=end_time,
                title=chapter_title(text, index),
                summary=chapter_summary(text),
                score=scores.score,
                scores=scores,
            )
        )

    return chapters


def _segments_in_range(
    request: ChapterGenerationRequest,
    start_time: float,
    end_time: float,
) -> list:
    """Return transcript segments that overlap a chapter time range."""
    return [
        segment
        for segment in request.segments
        if segment.end_seconds > start_time and segment.start_seconds < end_time
    ]


def _merge_candidate_scores(
    base_scores: ChapterBoundaryScores,
    candidate: ChapterBoundaryCandidate | None,
) -> ChapterBoundaryScores:
    """Combine final boundary scores with cheap candidate metadata."""
    if candidate is None:
        return base_scores

    return base_scores.model_copy(
        update={
            "lexical_shift_score": candidate.lexical_shift_score,
            "boundary_quality_score": candidate.boundary_quality_score,
        }
    )
