from uuid import UUID

from app.db.short_clip_repository import ShortClipSource
from app.proto_path import ensure_proto_generated_on_path
from app.schemas.jobs.short_clip_message import ShortClipJobPreferences
from app.schemas.short_clip.result import ShortClipCandidateResult

ensure_proto_generated_on_path()

from short_clip.v1 import short_clip_pb2  # type: ignore # noqa: E402


def build_generate_clip_candidates_request(
    *,
    request_id: str,
    source: ShortClipSource,
    preferences: ShortClipJobPreferences,
) -> short_clip_pb2.GenerateClipCandidatesRequest:  # type: ignore
    return short_clip_pb2.GenerateClipCandidatesRequest(  # type: ignore
        request_id=request_id,
        transcript_id=str(source.transcript.id),
        transcript_version=source.transcript.version,
        language=source.transcript.language or preferences.language,
        media_duration_seconds=source.media.duration or 0.0,
        segments=[
            short_clip_pb2.TranscriptSegment(  # type: ignore
                segment_id=str(segment.id),
                start_seconds=segment.start_time,
                end_seconds=segment.end_time,
                text=segment.clean_text or segment.text,
            )
            for segment in source.segments
        ],
        chapters=[
            short_clip_pb2.ChapterContext(  # type: ignore
                chapter_id=str(chapter.id),
                start_seconds=chapter.start_time,
                end_seconds=chapter.end_time,
                title=chapter.title,
                summary="",
            )
            for chapter in source.chapters
        ],
        preferences=short_clip_pb2.ShortClipPreferences(  # type: ignore
            clip_count=preferences.clip_count,
            clip_length=preferences.clip_length,
            min_duration_seconds=preferences.min_duration,
            max_duration_seconds=preferences.max_duration,
            aspect_ratio=preferences.aspect_ratio,
            language=preferences.language,
            genre=preferences.genre,
            clip_model=preferences.clip_model,
            auto_hook=preferences.auto_hook,
            prompt=preferences.prompt,
            caption_preset_id=preferences.caption_preset_id,
            burn_subtitle=preferences.burn_subtitle,
        ),
    )


def map_generate_clip_candidates_response(
    *,
    request_id: str,
    source: ShortClipSource,
    response: short_clip_pb2.GenerateClipCandidatesResponse,  # type: ignore
) -> list[ShortClipCandidateResult]:
    if response.request_id != request_id:
        raise ValueError("ai-service response request_id does not match request")

    if not response.candidates:
        raise ValueError("ai-service response did not include clip candidates")

    provider = _map_source(response.source)
    segments_by_id = {str(segment.id): segment for segment in source.segments}
    candidates = [
        _map_candidate(
            candidate,
            segments_by_id=segments_by_id,
            provider=provider,
            model=response.model or None,
        )
        for candidate in response.candidates
    ]

    return _validate_candidates(candidates, media_duration=source.media.duration)


def _map_source(source: int) -> str:
    if source == short_clip_pb2.SHORT_CLIP_SOURCE_NOOP:  # type: ignore
        return "NOOP"
    if source == short_clip_pb2.SHORT_CLIP_SOURCE_LLM:  # type: ignore
        return "LLM"

    raise ValueError("ai-service response short clip source is invalid")


def _map_candidate(
    candidate: short_clip_pb2.ClipCandidate,  # type: ignore
    *,
    segments_by_id: dict[str, object],
    provider: str,
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

    return ShortClipCandidateResult(
        start_segment_id=UUID(start_segment_id),
        end_segment_id=UUID(end_segment_id),
        source_segment_ids=[UUID(segment_id) for segment_id in source_segment_ids],
        start_time=candidate.start_seconds,
        end_time=candidate.end_seconds,
        duration=candidate.duration_seconds,
        title=candidate.title.strip() or "Generated short clip",
        reason=candidate.reason.strip() or "Short clip candidate from transcript.",
        score=round(min(max(float(candidate.score), 0.0), 10.0), 2),
        text=candidate.text.strip(),
        provider=provider,
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
