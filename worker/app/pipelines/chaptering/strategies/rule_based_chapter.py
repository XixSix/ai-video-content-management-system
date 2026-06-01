from app.pipelines.chaptering.selection import select_boundaries
from app.pipelines.chaptering.strategies.common import (
    build_chaptering_result,
    media_duration,
)
from app.schemas.chaptering.output import ChapteringJobOptions
from app.schemas.chaptering.result import (
    ChapteringResult,
    ChapteringTranscript,
)


def generate_rule_based_chapters(
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
) -> ChapteringResult:
    duration = media_duration(transcript)
    candidate_times = [segment.start_time for segment in transcript.segments[1:]]
    boundaries = select_boundaries(
        transcript.segments,
        media_duration=duration,
        min_duration=options.min_chapter_duration,
        target_duration=options.target_chapter_duration,
        max_chapters=options.max_chapters,
        candidate_times=candidate_times,
    )
    return build_chaptering_result(transcript, options, duration, boundaries)
