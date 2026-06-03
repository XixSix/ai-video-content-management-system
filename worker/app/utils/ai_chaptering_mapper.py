from app.proto_path import ensure_proto_generated_on_path
from app.schemas.chaptering.output import ChapteringJobOptions
from app.schemas.chaptering.result import (
    ChapterBoundaryScore,
    ChapterCandidate,
    ChapteringResult,
    ChapteringTranscript,
)

ensure_proto_generated_on_path()

from chaptering.v1 import chaptering_pb2  # type: ignore # noqa: E402


def build_generate_chapters_request(
    *,
    request_id: str,
    transcript: ChapteringTranscript,
    options: ChapteringJobOptions,
) -> chaptering_pb2.GenerateChaptersRequest:  # type: ignore
    return chaptering_pb2.GenerateChaptersRequest(  # type: ignore
        request_id=request_id,
        language=transcript.language or "",
        media_duration_seconds=transcript.media_duration or 0.0,
        segments=[
            chaptering_pb2.TranscriptSegment(  # type: ignore
                segment_id=str(segment.id),
                start_seconds=segment.start_time,
                end_seconds=segment.end_time,
                text=segment.text,
                clean_text=segment.clean_text or "",
            )
            for segment in transcript.segments
        ],
        options=chaptering_pb2.ChapteringOptions(  # type: ignore
            min_chapter_duration_seconds=options.min_chapter_duration,
            target_chapter_duration_seconds=options.target_chapter_duration,
            max_chapter_duration_seconds=options.target_chapter_duration * 2,
            max_chapters=options.max_chapters,
            use_embeddings=options.use_embeddings,
            use_llm=options.use_llm,
        ),
    )


def map_generate_chapters_response(
    *,
    request_id: str,
    transcript: ChapteringTranscript,
    response: chaptering_pb2.GenerateChaptersResponse,  # type: ignore
) -> ChapteringResult:
    if response.request_id != request_id:
        raise ValueError("ai-service response request_id does not match request")

    if not response.chapters:
        raise ValueError("ai-service response did not include chapters")

    source = _map_source(response.source)
    chapters = [_map_chapter(chapter) for chapter in response.chapters]
    _validate_chapters(chapters, media_duration=transcript.media_duration)

    return ChapteringResult(
        transcript_id=transcript.id,
        transcript_version=transcript.version,
        source=source,
        model=response.model,
        chapters=chapters,
    )


def _map_source(source: int) -> str:
    if source == chaptering_pb2.CHAPTER_SOURCE_RULE_BASED:  # type: ignore
        return "RULE_BASED"
    if source == chaptering_pb2.CHAPTER_SOURCE_LLM:  # type: ignore
        return "LLM"

    raise ValueError("ai-service response chapter source is invalid")


def _map_chapter(chapter: chaptering_pb2.GeneratedChapter) -> ChapterCandidate:  # type: ignore
    scores = chapter.scores
    score = scores.score or chapter.score

    return ChapterCandidate(
        chapter_index=chapter.index,
        start_time=chapter.start_seconds,
        end_time=chapter.end_seconds,
        title=chapter.title.strip(),
        summary=chapter.summary.strip() or None,
        text="",
        score=ChapterBoundaryScore(
            score=score,
            boundary_score=scores.boundary_score or score,
            pause_score=scores.pause_score,
            discourse_marker_score=scores.discourse_marker_score,
            semantic_shift_score=scores.semantic_shift_score,
            duration_score=scores.duration_score,
        ),
    )


def _validate_chapters(
    chapters: list[ChapterCandidate],
    *,
    media_duration: float | None,
) -> None:
    expected_indexes = list(range(1, len(chapters) + 1))
    actual_indexes = [chapter.chapter_index for chapter in chapters]
    if actual_indexes != expected_indexes:
        raise ValueError("ai-service response chapter indexes are invalid")

    previous_start = -1.0
    for index, chapter in enumerate(chapters):
        if chapter.start_time < previous_start:
            raise ValueError("ai-service response chapters are not sorted")
        if chapter.start_time >= chapter.end_time:
            raise ValueError(
                f"ai-service response chapters[{index}] has invalid timestamps"
            )
        if media_duration is not None and chapter.end_time > media_duration + 1.0:
            raise ValueError(
                f"ai-service response chapters[{index}] exceeds media duration"
            )
        if not chapter.title:
            raise ValueError(f"ai-service response chapters[{index}].title is required")
        previous_start = chapter.start_time
