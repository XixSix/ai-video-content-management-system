from uuid import UUID

from app.db.short_clip_repository import ShortClipSource
from app.proto_path import ensure_proto_generated_on_path
from app.schemas.short_clip.input import GenerateShortClipsOptions
from app.schemas.short_clip.result import ShortClipCandidateResult

ensure_proto_generated_on_path()

from generate_short_clips.v1 import generate_short_clips_pb2  # type: ignore # noqa: E402


def build_generate_short_clips_request(
    *,
    request_id: str,
    source: ShortClipSource,
    options: GenerateShortClipsOptions,
) -> generate_short_clips_pb2.GenerateShortClipsRequest:  # type: ignore
    return generate_short_clips_pb2.GenerateShortClipsRequest(  # type: ignore
        job_id=request_id,
        input=generate_short_clips_pb2.GenerateShortClipsInput(  # type: ignore
            transcript=generate_short_clips_pb2.TranscriptInput(  # type: ignore
                language=source.transcript.language or options.language,
                media_duration_seconds=source.media.duration or 0.0,
                segments=[
                    generate_short_clips_pb2.TranscriptSegment(  # type: ignore
                        segment_id=str(segment.id),
                        start_seconds=segment.start_time,
                        end_seconds=segment.end_time,
                        text=segment.clean_text or segment.text,
                    )
                    for segment in source.segments
                ],
            ),
            chapters=[
                generate_short_clips_pb2.ChapterContext(  # type: ignore
                    chapter_id=str(chapter.id),
                    start_seconds=chapter.start_time,
                    end_seconds=chapter.end_time,
                    title=chapter.title,
                    summary="",
                )
                for chapter in source.chapters
            ],
        ),
        options=generate_short_clips_pb2.GenerateShortClipsOptions(  # type: ignore
            clip_count=options.clip_count,
            min_duration_seconds=options.min_duration,
            max_duration_seconds=options.max_duration,
            aspect_ratio=options.aspect_ratio,
            platform=options.platform,
            genre=options.genre,
            tone=options.tone,
            prompt=options.prompt or "",
            llm=generate_short_clips_pb2.LLMOptions(  # type: ignore
                enabled=options.llm.enabled,
                model=options.llm.model or "",
            ),
        ),
    )


def map_generate_short_clips_response(
    *,
    request_id: str,
    source: ShortClipSource,
    response: generate_short_clips_pb2.GenerateShortClipsResponse,  # type: ignore
) -> list[ShortClipCandidateResult]:
    if response.job_id != request_id:
        raise ValueError("ai-service response job_id does not match request")

    if response.status == generate_short_clips_pb2.GENERATE_SHORT_CLIPS_STATUS_FAILED:  # type: ignore
        if response.HasField("error"):
            raise ValueError(f"{response.error.code}: {response.error.message}")
        raise ValueError("ai-service short clip generation failed")

    if (
        response.status
        != generate_short_clips_pb2.GENERATE_SHORT_CLIPS_STATUS_COMPLETED
    ):  # type: ignore
        raise ValueError("ai-service response status is not completed")

    if not response.candidates:
        raise ValueError("ai-service response did not include clip candidates")

    segments_by_id = {str(segment.id): segment for segment in source.segments}
    candidates = [
        _map_candidate(
            candidate,
            segments_by_id=segments_by_id,
            model=response.model or None,
        )
        for candidate in response.candidates
    ]

    return _validate_candidates(candidates, media_duration=source.media.duration)


def _map_candidate(
    candidate: generate_short_clips_pb2.GeneratedShortClipCandidate,  # type: ignore
    *,
    segments_by_id: dict[str, object],
    model: str | None,
) -> ShortClipCandidateResult:
    start_segment_id = candidate.start_segment_id.strip()
    end_segment_id = candidate.end_segment_id.strip()
    source_segment_ids = [
        segment_id.strip()
        for segment_id in candidate.source_segment_ids
        if segment_id.strip()
    ]

    if start_segment_id not in segments_by_id or end_segment_id not in segments_by_id:
        raise ValueError("ai-service response references unknown segment ids")

    for segment_id in source_segment_ids:
        if segment_id not in segments_by_id:
            raise ValueError(
                "ai-service response references unknown source segment ids"
            )

    start_seconds = candidate.start_seconds
    end_seconds = candidate.end_seconds

    return ShortClipCandidateResult(
        start_segment_id=UUID(start_segment_id),
        end_segment_id=UUID(end_segment_id),
        source_segment_ids=[UUID(segment_id) for segment_id in source_segment_ids],
        start_time=start_seconds,
        end_time=end_seconds,
        duration=end_seconds - start_seconds,
        title=candidate.title.strip() or "Generated short clip",
        reason=candidate.reason.strip() or "Short clip candidate from transcript.",
        score=round(min(max(float(candidate.score), 0.0), 10.0), 2),
        text=candidate.text.strip(),
        provider="ai-service",
        model=model,
    )


def _validate_candidates(
    candidates: list[ShortClipCandidateResult],
    *,
    media_duration: float | None,
) -> list[ShortClipCandidateResult]:
    valid_candidates: list[ShortClipCandidateResult] = []

    for index, candidate in enumerate(candidates):
        if candidate.start_time >= candidate.end_time:
            raise ValueError(
                f"ai-service response candidates[{index}] has invalid timestamps"
            )
        if candidate.duration <= 0:
            raise ValueError(
                f"ai-service response candidates[{index}] has invalid duration"
            )
        if media_duration is not None and candidate.end_time > media_duration + 1.0:
            raise ValueError(
                f"ai-service response candidates[{index}] exceeds media duration"
            )
        if not candidate.text:
            raise ValueError(f"ai-service response candidates[{index}].text is empty")

        valid_candidates.append(candidate)

    return valid_candidates
