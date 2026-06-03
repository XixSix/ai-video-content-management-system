from app.provider_contracts.text_embedding import TextEmbeddingPort
from app.schemas.chaptering import ChapterGenerationRequest, ChapterGenerationResult
from app.workflows.chaptering.pipelines.shared import run_units_pipeline
from app.workflows.chaptering.schemas import ChapteringPipelineConfig
from app.workflows.chaptering.segment_units import build_segment_chapter_units


def run_segment_pipeline(
    *,
    request: ChapterGenerationRequest,
    embedding: TextEmbeddingPort,
    config: ChapteringPipelineConfig,
) -> ChapterGenerationResult:
    """Generate chapters from segment-timestamped transcript units.

    This strategy builds stable transcript units, creates hard-valid boundary
    candidates, keeps a bounded candidate set, optionally scores left/right
    context windows with embeddings, then selects final starts under chapter
    duration constraints. It does not call an LLM or persist data.
    """
    units = build_segment_chapter_units(
        request.segments,
        max_unit_duration=config.max_unit_duration_seconds,
        pause_boundary_seconds=config.pause_boundary_seconds,
        target_unit_duration=config.target_unit_duration_seconds,
        target_unit_words=config.target_unit_words,
        max_unit_words=config.max_unit_words,
        max_unit_chars=config.max_unit_chars,
        punctuation_poor_threshold=config.punctuation_poor_threshold,
    )
    return run_units_pipeline(
        request=request,
        units=units,
        embedding=embedding,
        config=config,
    )
