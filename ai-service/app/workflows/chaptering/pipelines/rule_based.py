from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.common import build_chapters, media_duration
from app.workflows.chaptering.schemas import ChapteringPipelineConfig
from app.workflows.chaptering.selection import select_boundaries


def run_rule_based_pipeline(
    *,
    request: ChapterGenerationRequest,
    config: ChapteringPipelineConfig,
) -> ChapterGenerationResult:
    """Generate chapters from raw transcript boundaries without candidates.

    This strategy is the deterministic fallback. It uses transcript segment
    starts directly as possible boundaries and does not build units, score
    candidate windows, call embeddings, or call an LLM.
    """
    duration = media_duration(request)
    options = request.options
    boundaries = select_boundaries(
        request.segments,
        media_duration=duration,
        min_duration=options.min_chapter_duration_seconds,
        target_duration=options.target_chapter_duration_seconds,
        max_chapters=options.max_chapters,
    )

    return ChapterGenerationResult(
        request_id=request.request_id,
        language=request.language,
        model=config.model_name,
        source="RULE_BASED",
        chapters=build_chapters(
            request,
            duration=duration,
            boundaries=boundaries,
        ),
    )
