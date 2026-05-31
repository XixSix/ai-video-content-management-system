from app.core.config import settings
from app.pipelines.chaptering.candidates import generate_boundary_candidates
from app.pipelines.chaptering.selection import select_boundaries
from app.pipelines.chaptering.strategies.common import (
    build_chaptering_result,
    media_duration,
)
from app.pipelines.chaptering.units import build_chapter_units
from app.schemas.chaptering.output import ChapteringJobOptions
from app.schemas.chaptering.result import (
    ChapteringResult,
    ChapteringTranscript,
)


def generate_candidate_chapters(
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
) -> ChapteringResult:
    duration = media_duration(transcript)
    units = build_chapter_units(
        transcript.segments,
        max_unit_duration=settings.chaptering_max_unit_duration_seconds,
        pause_boundary_seconds=settings.chaptering_pause_boundary_seconds,
    )
    candidates = generate_boundary_candidates(
        units,
        media_duration=duration,
        min_chapter_duration=options.min_chapter_duration,
        max_chapters=options.max_chapters,
        density_multiplier=settings.chaptering_candidate_density_multiplier,
    )
    boundaries = select_boundaries(
        transcript.segments,
        media_duration=duration,
        min_duration=options.min_chapter_duration,
        target_duration=options.target_chapter_duration,
        max_chapters=options.max_chapters,
        candidate_times=[candidate.time for candidate in candidates],
    )
    return build_chaptering_result(transcript, options, duration, boundaries)
