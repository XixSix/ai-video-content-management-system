# pyright: reportAttributeAccessIssue=false

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_generate_short_clips_workflow
from app.schemas.generate_short_clips import (
    GeneratedShortClipCandidate,
    GenerateShortClipsChapterContext,
    GenerateShortClipsRequest,
    GenerateShortClipsResult,
    GenerateShortClipsPreferences,
    GenerateShortClipsTranscriptSegment,
)
from app.workflows.generate_short_clips.workflow import GenerateShortClipsWorkflow

ensure_proto_generated_on_path()

from generate_short_clips.v1 import (  # noqa: E402
    generate_short_clips_pb2,
    generate_short_clips_pb2_grpc,
)  # type: ignore

ASPECT_RATIO_VALUES = {"9:16", "1:1", "16:9"}
LANGUAGE_VALUES = {"AUTO", "ENGLISH", "VIETNAMESE"}
GENRE_VALUES = {"AUTO", "PODCAST", "INTERVIEW", "TUTORIAL", "WEBINAR"}


class GenerateShortClipsServicer(
    generate_short_clips_pb2_grpc.GenerateShortClipsServiceServicer
):
    def __init__(
        self,
        workflow: GenerateShortClipsWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_generate_short_clips_workflow()

    def GenerateShortClips(
        self,
        request: generate_short_clips_pb2.GenerateShortClipsRequest,
        context: grpc.ServicerContext,
    ) -> generate_short_clips_pb2.GenerateShortClipsResponse:
        self._validate_request(request, context)
        workflow_request = self._map_request(request)

        try:
            result = self._workflow.execute(workflow_request)
        except ValueError as error:
            return _failed_response(
                request.job_id,
                generate_short_clips_pb2.GENERATE_SHORT_CLIPS_ERROR_CODE_INVALID_MODEL_OUTPUT,
                str(error),
                retryable=False,
            )
        except Exception as error:
            return _failed_response(
                request.job_id,
                generate_short_clips_pb2.GENERATE_SHORT_CLIPS_ERROR_CODE_LLM_PROVIDER_FAILED,
                str(error) or "generate short clips workflow failed",
                retryable=True,
            )

        return self._map_response(result)

    def _validate_request(
        self,
        request: generate_short_clips_pb2.GenerateShortClipsRequest,
        context: grpc.ServicerContext,
    ) -> None:
        if not request.job_id.strip():
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "job_id is required")

        transcript = request.input.transcript
        if transcript.media_duration_seconds <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "media_duration_seconds must be greater than 0",
            )

        if not transcript.segments:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "segments are required")

        previous_start = -1.0
        has_text = False
        for index, segment in enumerate(transcript.segments):
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
            if segment.end_seconds > transcript.media_duration_seconds + 1.0:
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

        self._validate_options(request.options, context)

    def _validate_options(
        self,
        options: generate_short_clips_pb2.GenerateShortClipsOptions,
        context: grpc.ServicerContext,
    ) -> None:
        if options.clip_count < 1 or options.clip_count > 10:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.clip_count must be between 1 and 10",
            )

        if options.min_duration_seconds < 5:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.min_duration_seconds must be at least 5",
            )

        if options.max_duration_seconds < 5:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.max_duration_seconds must be at least 5",
            )

        if options.min_duration_seconds > options.max_duration_seconds:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.min_duration_seconds must be <= max_duration_seconds",
            )

        if options.max_duration_seconds > 180:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.max_duration_seconds must be <= 180",
            )

        _validate_choice(
            context, options.aspect_ratio, ASPECT_RATIO_VALUES, "aspect_ratio"
        )

        if len(options.prompt.strip()) > 1000:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.prompt must be at most 1000 characters",
            )

    def _map_request(
        self,
        request: generate_short_clips_pb2.GenerateShortClipsRequest,
    ) -> GenerateShortClipsRequest:
        transcript = request.input.transcript
        return GenerateShortClipsRequest(
            request_id=request.job_id.strip(),
            language=transcript.language.strip() or None,
            media_duration_seconds=transcript.media_duration_seconds,
            segments=[
                GenerateShortClipsTranscriptSegment(
                    segment_id=segment.segment_id.strip(),
                    start_seconds=segment.start_seconds,
                    end_seconds=segment.end_seconds,
                    text=segment.text.strip(),
                )
                for segment in transcript.segments
            ],
            chapters=[
                GenerateShortClipsChapterContext(
                    chapter_id=chapter.chapter_id.strip(),
                    start_seconds=chapter.start_seconds,
                    end_seconds=chapter.end_seconds,
                    title=chapter.title.strip(),
                    summary=chapter.summary.strip() or None,
                )
                for chapter in request.input.chapters
                if chapter.chapter_id.strip()
            ],
            preferences=_map_options(request.options, transcript.language),
        )

    def _map_response(
        self,
        result: GenerateShortClipsResult,
    ) -> generate_short_clips_pb2.GenerateShortClipsResponse:
        return generate_short_clips_pb2.GenerateShortClipsResponse(
            job_id=result.request_id,
            status=generate_short_clips_pb2.GENERATE_SHORT_CLIPS_STATUS_COMPLETED,  # type: ignore
            model=result.model,
            candidates=[_map_candidate(candidate) for candidate in result.candidates],
        )


def _map_options(
    options: generate_short_clips_pb2.GenerateShortClipsOptions,
    language: str,
) -> GenerateShortClipsPreferences:
    return GenerateShortClipsPreferences(
        clip_count=options.clip_count,
        clip_length="AUTO",
        min_duration_seconds=options.min_duration_seconds,
        max_duration_seconds=options.max_duration_seconds,
        aspect_ratio=options.aspect_ratio,
        language=_map_language(language),
        genre=options.genre if options.genre in GENRE_VALUES else "AUTO",
        clip_model="BALANCED" if options.llm.enabled else "AUTO",
        auto_hook=True,
        prompt=options.prompt.strip(),
        caption_preset_id="karaoke",
        burn_subtitle=True,
    )


def _map_candidate(
    candidate: GeneratedShortClipCandidate,
) -> generate_short_clips_pb2.GeneratedShortClipCandidate:
    return generate_short_clips_pb2.GeneratedShortClipCandidate(
        start_segment_id=candidate.start_segment_id,
        end_segment_id=candidate.end_segment_id,
        source_segment_ids=candidate.source_segment_ids,
        start_seconds=candidate.start_seconds,
        end_seconds=candidate.end_seconds,
        title=candidate.title,
        reason=candidate.reason,
        score=candidate.score,
        text=candidate.text,
    )


def _map_language(language: str) -> str:
    normalized = language.strip().lower()
    if normalized == "en":
        return "ENGLISH"
    if normalized == "vi":
        return "VIETNAMESE"
    if language in LANGUAGE_VALUES:
        return language
    return "AUTO"


def _validate_choice(
    context: grpc.ServicerContext,
    value: str,
    allowed_values: set[str],
    field_name: str,
) -> None:
    if value not in allowed_values:
        context.abort(
            grpc.StatusCode.INVALID_ARGUMENT,
            f"options.{field_name} is invalid",
        )


def _failed_response(
    job_id: str,
    code: int,
    message: str,
    *,
    retryable: bool,
) -> generate_short_clips_pb2.GenerateShortClipsResponse:
    return generate_short_clips_pb2.GenerateShortClipsResponse(
        job_id=job_id,
        status=generate_short_clips_pb2.GENERATE_SHORT_CLIPS_STATUS_FAILED,
        error=generate_short_clips_pb2.GenerateShortClipsError(
            code=code,
            message=message,
            retryable=retryable,
        ),
    )
