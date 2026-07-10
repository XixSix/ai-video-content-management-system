from app.schemas.generate_chapters import (
    ChapterBoundaryScores,
    GenerateChaptersRequest,
    GeneratedChapter,
)
from app.workflows.generate_chapters.schemas import ChapterCandidate
from app.workflows.generate_chapters.scores.scoring import score_boundary
from app.workflows.generate_chapters.titles import (
    chapter_summary,
    chapter_text,
    chapter_title,
)


def media_duration(request: GenerateChaptersRequest) -> float:
    """Return supplied media duration or infer it from the last segment end."""
    if (
        request.media_duration_seconds is not None
        and request.media_duration_seconds > 0
    ):
        return request.media_duration_seconds

    return max(segment.end_seconds for segment in request.segments)


def build_chapters(
    request: GenerateChaptersRequest,
    *,
    duration: float,
    boundaries: list[float],
    semantic_shift_scores_by_time: dict[float, float] | None = None,
    candidates_by_time: dict[float, ChapterCandidate] | None = None,
) -> list[GeneratedChapter]:
    """Build chapter DTOs and attach deterministic score metadata."""
    chapters: list[GeneratedChapter] = []
    semantic_scores = semantic_shift_scores_by_time or {}
    candidates = candidates_by_time or {}

    for index, start_time in enumerate(boundaries, start=1):
        end_time = boundaries[index] if index < len(boundaries) else duration
        chapter_segments = segments_in_range(request, start_time, end_time)
        text = chapter_text(chapter_segments)
        base_scores = score_boundary(
            request.segments,
            start_time=start_time,
            previous_start=boundaries[index - 2] if index > 1 else 0.0,
            target_duration=request.options.target_chapter_duration_seconds,
            semantic_shift=semantic_scores.get(start_time, 0.0),
        )
        scores = merge_candidate_scores(base_scores, candidates.get(start_time))
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


def segments_in_range(
    request: GenerateChaptersRequest,
    start_time: float,
    end_time: float,
) -> list:
    """Return transcript segments that overlap a chapter time range."""
    return [
        segment
        for segment in request.segments
        if segment.end_seconds > start_time and segment.start_seconds < end_time
    ]


def merge_candidate_scores(
    base_scores: ChapterBoundaryScores,
    candidate: ChapterCandidate | None,
) -> ChapterBoundaryScores:
    """Combine final boundary scores with cheap candidate metadata."""
    if candidate is None:
        return base_scores

    score = candidate.candidate_score or base_scores.score
    return base_scores.model_copy(
        update={
            "score": score,
            "semantic_shift_score": candidate.semantic_shift_score,
            "semantic_cohesion_score": candidate.semantic_cohesion_score,
            "lexical_shift_score": candidate.lexical_shift_score,
            "valley_depth_score": candidate.valley_depth_score,
            "boundary_quality_score": candidate.boundary_quality_score,
            "llm_confidence_score": candidate.llm_confidence_score,
        }
    )
