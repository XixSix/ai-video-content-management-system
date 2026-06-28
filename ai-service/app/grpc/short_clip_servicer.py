# pyright: reportAttributeAccessIssue=false

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_short_clip_workflow
from app.schemas.short_clip import (
    ClipCandidate,
    ShortClipChapterContext,
    ShortClipGenerationRequest,
    ShortClipGenerationResult,
    ShortClipPreferences,
    ShortClipTranscriptSegment,
)
from app.workflows.short_clip.workflow import ShortClipWorkflow

ensure_proto_generated_on_path()

from short_clip.v1 import short_clip_pb2, short_clip_pb2_grpc  # type: ignore # noqa: E402

CLIP_LENGTH_VALUES = {"AUTO", "15_30", "30_60", "60_90"}
ASPECT_RATIO_VALUES = {"9:16", "1:1", "16:9"}
LANGUAGE_VALUES = {"AUTO", "ENGLISH", "VIETNAMESE"}
GENRE_VALUES = {"AUTO", "PODCAST", "INTERVIEW", "TUTORIAL", "WEBINAR"}
CLIP_MODEL_VALUES = {"AUTO", "BALANCED", "VIRAL_HOOKS"}


class ShortClipServicer(short_clip_pb2_grpc.ShortClipServiceServicer):
    def __init__(
        self,
        workflow: ShortClipWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_short_clip_workflow()

    def GenerateClipCandidates(
        self,
        request: short_clip_pb2.GenerateClipCandidatesRequest,
        context: grpc.ServicerContext,
    ) -> short_clip_pb2.GenerateClipCandidatesResponse:
        self._validate_request(request, context)
        workflow_request = self._map_request(request)

        result = self._workflow.execute(workflow_request)
        return self._map_response(result)

    def _validate_request(
        self,
        request: short_clip_pb2.GenerateClipCandidatesRequest,
        context: grpc.ServicerContext,
    ) -> None:
        if not request.request_id.strip():
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id is required")

        if request.media_duration_seconds <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "media_duration_seconds must be greater than 0",
            )

        if not request.segments:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "segments are required")

        previous_start = -1.0
        has_text = False
        for index, segment in enumerate(request.segments):
            if not segment.segment_id.strip():
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"segments[{index}].segment_id is required",
                )
            if segment.start_seconds >= segment.end_seconds:
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"segments[{index}] must have start_seconds < end_seconds",
                )
            if segment.start_seconds < previous_start:
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    "segments must be sorted by timestamp",
                )
            if segment.end_seconds > request.media_duration_seconds + 1.0:
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"segments[{index}] exceeds media_duration_seconds",
                )
            if segment.text.strip():
                has_text = True
            previous_start = segment.start_seconds

        if not has_text:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "transcript text is empty",
            )

        self._validate_preferences(request.preferences, context)

    def _validate_preferences(
        self,
        preferences: short_clip_pb2.ShortClipPreferences,
        context: grpc.ServicerContext,
    ) -> None:
        if preferences.clip_count < 1 or preferences.clip_count > 10:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "preferences.clip_count must be between 1 and 10",
            )

        if preferences.min_duration_seconds < 5:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "preferences.min_duration_seconds must be at least 5",
            )

        if preferences.max_duration_seconds < 5:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "preferences.max_duration_seconds must be at least 5",
            )

        if preferences.min_duration_seconds > preferences.max_duration_seconds:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "preferences.min_duration_seconds must be <= max_duration_seconds",
            )

        if preferences.max_duration_seconds > 180:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "preferences.max_duration_seconds must be <= 180",
            )

        _validate_choice(
            context, preferences.clip_length, CLIP_LENGTH_VALUES, "clip_length"
        )
        _validate_choice(
            context, preferences.aspect_ratio, ASPECT_RATIO_VALUES, "aspect_ratio"
        )
        _validate_choice(context, preferences.language, LANGUAGE_VALUES, "language")
        _validate_choice(context, preferences.genre, GENRE_VALUES, "genre")
        _validate_choice(
            context, preferences.clip_model, CLIP_MODEL_VALUES, "clip_model"
        )

        if not preferences.caption_preset_id.strip():
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "preferences.caption_preset_id is required",
            )

        if len(preferences.prompt.strip()) > 1000:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "preferences.prompt must be at most 1000 characters",
            )

    def _map_request(
        self,
        request: short_clip_pb2.GenerateClipCandidatesRequest,
    ) -> ShortClipGenerationRequest:
        return ShortClipGenerationRequest(
            request_id=request.request_id.strip(),
            transcript_id=request.transcript_id.strip() or None,
            transcript_version=request.transcript_version or None,
            language=request.language.strip() or None,
            media_duration_seconds=request.media_duration_seconds,
            segments=[
                ShortClipTranscriptSegment(
                    segment_id=segment.segment_id.strip(),
                    start_seconds=segment.start_seconds,
                    end_seconds=segment.end_seconds,
                    text=segment.text.strip(),
                )
                for segment in request.segments
            ],
            chapters=[
                ShortClipChapterContext(
                    chapter_id=chapter.chapter_id.strip(),
                    start_seconds=chapter.start_seconds,
                    end_seconds=chapter.end_seconds,
                    title=chapter.title.strip(),
                    summary=chapter.summary.strip() or None,
                )
                for chapter in request.chapters
                if chapter.chapter_id.strip()
            ],
            preferences=_map_preferences(request.preferences),
        )

    def _map_response(
        self,
        result: ShortClipGenerationResult,
    ) -> short_clip_pb2.GenerateClipCandidatesResponse:
        return short_clip_pb2.GenerateClipCandidatesResponse(
            request_id=result.request_id,
            language=result.language or "",
            model=result.model,
            source=_map_source(result.source),
            candidates=[_map_candidate(candidate) for candidate in result.candidates],
        )


def _map_preferences(
    preferences: short_clip_pb2.ShortClipPreferences,
) -> ShortClipPreferences:
    return ShortClipPreferences(
        clip_count=preferences.clip_count,
        clip_length=preferences.clip_length,
        min_duration_seconds=preferences.min_duration_seconds,
        max_duration_seconds=preferences.max_duration_seconds,
        aspect_ratio=preferences.aspect_ratio,
        language=preferences.language,
        genre=preferences.genre,
        clip_model=preferences.clip_model,
        auto_hook=preferences.auto_hook,
        prompt=preferences.prompt.strip(),
        caption_preset_id=preferences.caption_preset_id.strip(),
        burn_subtitle=preferences.burn_subtitle,
    )


def _map_candidate(candidate: ClipCandidate) -> short_clip_pb2.ClipCandidate:
    return short_clip_pb2.ClipCandidate(
        start_segment_id=candidate.start_segment_id,
        end_segment_id=candidate.end_segment_id,
        source_segment_ids=candidate.source_segment_ids,
        start_seconds=candidate.start_seconds,
        end_seconds=candidate.end_seconds,
        duration_seconds=candidate.duration_seconds,
        title=candidate.title,
        reason=candidate.reason,
        score=candidate.score,
        text=candidate.text,
    )


def _map_source(source: str) -> int:
    if source == "NOOP":
        return short_clip_pb2.SHORT_CLIP_SOURCE_NOOP
    if source == "LLM":
        return short_clip_pb2.SHORT_CLIP_SOURCE_LLM

    return short_clip_pb2.SHORT_CLIP_SOURCE_UNSPECIFIED


def _validate_choice(
    context: grpc.ServicerContext,
    value: str,
    allowed_values: set[str],
    field_name: str,
) -> None:
    if value not in allowed_values:
        context.abort(
            grpc.StatusCode.INVALID_ARGUMENT,
            f"preferences.{field_name} is invalid",
        )
