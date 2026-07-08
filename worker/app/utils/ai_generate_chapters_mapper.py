from app.proto_path import ensure_proto_generated_on_path
from app.schemas.chapters.input import GenerateChaptersOptions
from app.schemas.chapters.result import (
    ChapterBoundaryScore,
    ChapterCandidate,
    GeneratedChaptersResult,
    GenerateChaptersTranscript,
)

ensure_proto_generated_on_path()

from generate_chapters.v1 import generate_chapters_pb2  # type: ignore # noqa: E402


def build_generate_chapters_request(
    *,
    request_id: str,
    transcript: GenerateChaptersTranscript,
    options: GenerateChaptersOptions,
) -> generate_chapters_pb2.GenerateChaptersRequest:  # type: ignore
    return generate_chapters_pb2.GenerateChaptersRequest(  # type: ignore
        job_id=request_id,
        transcript=generate_chapters_pb2.TranscriptInput(  # type: ignore
            language=transcript.language or "",
            media_duration_seconds=transcript.media_duration or 0.0,
            segments=[
                generate_chapters_pb2.TranscriptSegment(  # type: ignore
                    segment_id=str(segment.id),
                    start_seconds=segment.start_time,
                    end_seconds=segment.end_time,
                    text=segment.text,
                )
                for segment in transcript.segments
            ],
        ),
        options=generate_chapters_pb2.GenerateChaptersOptions(  # type: ignore
            min_chapter_duration_seconds=options.min_chapter_duration,
            target_chapter_duration_seconds=options.target_chapter_duration,
            max_chapter_duration_seconds=options.max_chapter_duration,
            max_chapters=options.max_chapters,
            embeddings=generate_chapters_pb2.EmbeddingOptions(  # type: ignore
                enabled=options.embeddings.enabled,
                model=options.embeddings.model or "",
            ),
            llm=generate_chapters_pb2.LLMOptions(  # type: ignore
                enabled=options.llm.enabled,
                model=options.llm.model or "",
            ),
        ),
    )


def map_generate_chapters_response(
    *,
    request_id: str,
    transcript: GenerateChaptersTranscript,
    response: generate_chapters_pb2.GenerateChaptersResponse,  # type: ignore
) -> GeneratedChaptersResult:
    if response.job_id != request_id:
        raise ValueError("ai-service response job_id does not match request")

    if response.status == generate_chapters_pb2.GENERATE_CHAPTERS_STATUS_FAILED:  # type: ignore
        if response.HasField("error"):
            error_code = generate_chapters_pb2.GenerateChaptersErrorCode.Name(  # type: ignore
                response.error.code
            )
            raise ValueError(f"{error_code}: {response.error.message}")

        raise ValueError("ai-service chapter generation failed without error details")

    if response.status != generate_chapters_pb2.GENERATE_CHAPTERS_STATUS_COMPLETED:  # type: ignore
        raise ValueError("ai-service response did not complete chapter generation")

    if not response.chapters:
        raise ValueError("ai-service response did not include chapters")

    source = _map_source(response.source)
    chapters = _map_chapters(
        response.chapters, media_duration=transcript.media_duration
    )
    _validate_chapters(chapters, media_duration=transcript.media_duration)

    return GeneratedChaptersResult(
        transcript_id=transcript.id,
        transcript_version=transcript.version,
        source=source,
        model=response.model,
        chapters=chapters,
    )


def _map_source(source: int) -> str:
    if source == generate_chapters_pb2.CHAPTER_SOURCE_SEGMENTS:  # type: ignore
        return "SEGMENTS"
    if source == generate_chapters_pb2.CHAPTER_SOURCE_WORDS:  # type: ignore
        return "WORDS"

    raise ValueError("ai-service response chapter source is invalid")


def _map_chapters(
    chapters: list[generate_chapters_pb2.GeneratedChapter],  # type: ignore
    *,
    media_duration: float | None,
) -> list[ChapterCandidate]:
    mapped: list[ChapterCandidate] = []

    for index, chapter in enumerate(chapters):
        next_start = (
            chapters[index + 1].start_seconds
            if index + 1 < len(chapters)
            else media_duration
        )
        if next_start is None:
            raise ValueError("media duration is required to close final chapter")

        mapped.append(_map_chapter(chapter, end_time=next_start))

    return mapped


def _map_chapter(
    chapter: generate_chapters_pb2.GeneratedChapter,  # type: ignore
    *,
    end_time: float,
) -> ChapterCandidate:
    scores = chapter.scores
    score = _optional_score(scores, "score", 0.0)

    return ChapterCandidate(
        chapter_index=chapter.index,
        start_time=chapter.start_seconds,
        end_time=end_time,
        title=chapter.title.strip(),
        summary=chapter.summary.strip() or None,
        text="",
        score=ChapterBoundaryScore(
            score=score,
            boundary_score=_optional_score(scores, "boundary_score", score),
            pause_score=_optional_score(scores, "pause_score", 0.0),
            discourse_marker_score=_optional_score(
                scores, "discourse_marker_score", 0.0
            ),
            semantic_shift_score=_optional_score(scores, "semantic_shift_score", 0.0),
            duration_score=_optional_score(scores, "duration_score", 0.0),
        ),
    )


def _optional_score(scores: object, field_name: str, fallback: float) -> float:
    if scores.HasField(field_name):  # type: ignore[attr-defined]
        return float(getattr(scores, field_name))

    return fallback


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
