from app.pipelines.chaptering.scoring import score_boundary
from app.pipelines.chaptering.titles import chapter_summary, chapter_text, chapter_title
from app.schemas.chaptering.output import ChapteringJobOptions
from app.schemas.chaptering.result import (
    CHAPTER_SOURCE_RULE_BASED,
    RULE_BASED_CHAPTERING_MODEL,
    ChapterCandidate,
    ChapteringResult,
    ChapteringTranscript,
    ChapteringTranscriptSegment,
)


def media_duration(transcript: ChapteringTranscript) -> float:
    if transcript.media_duration is not None and transcript.media_duration > 0:
        return transcript.media_duration

    return max(segment.end_time for segment in transcript.segments)


def build_chaptering_result(
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
    duration: float,
    boundaries: list[float],
) -> ChapteringResult:
    chapters: list[ChapterCandidate] = []

    for index, start_time in enumerate(boundaries, start=1):
        end_time = boundaries[index] if index < len(boundaries) else duration
        chapter_segments = _segments_in_range(transcript.segments, start_time, end_time)
        text = chapter_text(chapter_segments)
        chapters.append(
            ChapterCandidate(
                chapter_index=index,
                start_time=start_time,
                end_time=end_time,
                title=chapter_title(text, index),
                summary=chapter_summary(text),
                text=text,
                score=score_boundary(
                    transcript.segments,
                    start_time=start_time,
                    previous_start=boundaries[index - 2] if index > 1 else 0.0,
                    target_duration=options.target_chapter_duration,
                ),
            )
        )

    return ChapteringResult(
        transcript_id=transcript.id,
        transcript_version=transcript.version,
        source=CHAPTER_SOURCE_RULE_BASED,
        model=RULE_BASED_CHAPTERING_MODEL,
        chapters=chapters,
    )


def _segments_in_range(
    segments: list[ChapteringTranscriptSegment],
    start_time: float,
    end_time: float,
) -> list[ChapteringTranscriptSegment]:
    return [
        segment
        for segment in segments
        if segment.end_time > start_time and segment.start_time < end_time
    ]
