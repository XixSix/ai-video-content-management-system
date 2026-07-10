# pyright: reportAttributeAccessIssue=false

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_generate_chapters_workflow
from app.schemas.generate_chapters import (
    ChapterBoundaryScores,
    GenerateChaptersResult,
    GenerateChaptersOptions,
    GenerateChaptersRequest,
    GenerateChaptersTranscriptSegment,
    GenerateChaptersTranscriptWord,
)
from app.workflows.generate_chapters.errors import (
    UnsupportedGenerateChaptersStrategyError,
)
from app.workflows.generate_chapters.workflow import GenerateChaptersWorkflow

ensure_proto_generated_on_path()

from generate_chapters.v1 import (  # type: ignore # noqa: E402
    generate_chapters_pb2,
    generate_chapters_pb2_grpc,
)


class GenerateChaptersServicer(
    generate_chapters_pb2_grpc.GenerateChaptersServiceServicer
):
    def __init__(
        self,
        workflow: GenerateChaptersWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_generate_chapters_workflow()

    def GenerateChapters(
        self,
        request: generate_chapters_pb2.GenerateChaptersRequest,
        context: grpc.ServicerContext,
    ) -> generate_chapters_pb2.GenerateChaptersResponse:
        self._validate_request(request, context)
        workflow_request = self._map_request(request)

        try:
            result = self._workflow.execute(workflow_request)
        except UnsupportedGenerateChaptersStrategyError as error:
            return _failed_response(
                request.job_id,
                generate_chapters_pb2.GENERATE_CHAPTERS_ERROR_CODE_INTERNAL,
                str(error),
                retryable=False,
            )
        except ValueError as error:
            return _failed_response(
                request.job_id,
                generate_chapters_pb2.GENERATE_CHAPTERS_ERROR_CODE_INVALID_TRANSCRIPT,
                str(error),
                retryable=False,
            )
        except Exception as error:
            return _failed_response(
                request.job_id,
                generate_chapters_pb2.GENERATE_CHAPTERS_ERROR_CODE_LLM_PROVIDER_FAILED,
                str(error) or "generate chapters workflow failed",
                retryable=True,
            )

        return self._map_response(result, request=request)

    def _validate_request(
        self,
        request: generate_chapters_pb2.GenerateChaptersRequest,
        context: grpc.ServicerContext,
    ) -> None:
        job_id = request.job_id.strip()

        if not job_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "job_id is required")

        if not request.transcript.segments:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "segments are required")

        if request.transcript.media_duration_seconds <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "transcript.media_duration_seconds must be greater than 0",
            )

        previous_start = -1.0
        has_text = False
        for index, segment in enumerate(request.transcript.segments):
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
            if segment.end_seconds > request.transcript.media_duration_seconds + 1.0:
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"segments[{index}] exceeds transcript.media_duration_seconds",
                )
            if segment.text.strip():
                has_text = True
            previous_start = segment.start_seconds

        if not has_text:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "transcript text is empty",
            )

        if request.options.min_chapter_duration_seconds <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.min_chapter_duration_seconds must be greater than 0",
            )

        if request.options.target_chapter_duration_seconds <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.target_chapter_duration_seconds must be greater than 0",
            )

        if request.options.max_chapter_duration_seconds <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.max_chapter_duration_seconds must be greater than 0",
            )

        if request.options.max_chapters <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.max_chapters must be greater than 0",
            )

    def _map_request(
        self,
        request: generate_chapters_pb2.GenerateChaptersRequest,
    ) -> GenerateChaptersRequest:
        return GenerateChaptersRequest(
            request_id=request.job_id.strip(),
            language=request.transcript.language.strip() or None,
            media_duration_seconds=request.transcript.media_duration_seconds,
            segments=[
                GenerateChaptersTranscriptSegment(
                    segment_id=segment.segment_id.strip(),
                    start_seconds=segment.start_seconds,
                    end_seconds=segment.end_seconds,
                    text=segment.text.strip(),
                    speaker_label=segment.speaker.strip()
                    if segment.HasField("speaker")
                    else None,
                    words=_map_segment_words(segment),
                )
                for segment in request.transcript.segments
            ],
            options=GenerateChaptersOptions(
                min_chapter_duration_seconds=(
                    request.options.min_chapter_duration_seconds
                ),
                target_chapter_duration_seconds=(
                    request.options.target_chapter_duration_seconds
                ),
                max_chapter_duration_seconds=(
                    request.options.max_chapter_duration_seconds
                ),
                max_chapters=request.options.max_chapters,
                use_embeddings=request.options.embeddings.enabled,
                use_llm=request.options.llm.enabled,
            ),
        )

    def _map_response(
        self,
        result: GenerateChaptersResult,
        *,
        request: generate_chapters_pb2.GenerateChaptersRequest,
    ) -> generate_chapters_pb2.GenerateChaptersResponse:
        return generate_chapters_pb2.GenerateChaptersResponse(
            job_id=result.request_id,
            status=generate_chapters_pb2.GENERATE_CHAPTERS_STATUS_COMPLETED,
            model=result.model,
            source=_response_source(request),
            chapters=[
                generate_chapters_pb2.GeneratedChapter(
                    index=chapter.index,
                    start_seconds=chapter.start_seconds,
                    title=chapter.title,
                    summary=chapter.summary or "",
                    scores=_map_scores(chapter.scores),
                )
                for chapter in result.chapters
            ],
        )


def _response_source(request: generate_chapters_pb2.GenerateChaptersRequest) -> int:
    for segment in request.transcript.segments:
        if segment.words:
            return generate_chapters_pb2.CHAPTER_SOURCE_WORDS

    return generate_chapters_pb2.CHAPTER_SOURCE_SEGMENTS


def _map_scores(
    scores: ChapterBoundaryScores,
) -> generate_chapters_pb2.BoundaryScores:
    mapped = generate_chapters_pb2.BoundaryScores()
    _set_optional_score(mapped, "score", scores.score)
    _set_optional_score(mapped, "boundary_score", scores.boundary_score)
    _set_optional_score(mapped, "semantic_shift_score", scores.semantic_shift_score)
    _set_optional_score(mapped, "lexical_shift_score", scores.lexical_shift_score)
    _set_optional_score(mapped, "valley_depth_score", scores.valley_depth_score)
    _set_optional_score(mapped, "discourse_marker_score", scores.discourse_marker_score)
    _set_optional_score(mapped, "pause_score", scores.pause_score)
    _set_optional_score(mapped, "duration_score", scores.duration_score)
    _set_optional_score(mapped, "boundary_quality_score", scores.boundary_quality_score)
    _set_optional_score(mapped, "llm_confidence_score", scores.llm_confidence_score)
    return mapped


def _set_optional_score(
    scores: generate_chapters_pb2.BoundaryScores,
    field_name: str,
    value: float | None,
) -> None:
    if value is not None:
        setattr(scores, field_name, value)


def _map_segment_words(
    segment: generate_chapters_pb2.TranscriptSegment,
) -> list[GenerateChaptersTranscriptWord]:
    return [
        GenerateChaptersTranscriptWord(
            word_id=word.word_id.strip(),
            segment_id=segment.segment_id.strip(),
            start_seconds=word.start_seconds,
            end_seconds=word.end_seconds,
            text=word.text.strip(),
        )
        for word in segment.words
        if _is_usable_word(segment, word)
    ]


def _is_usable_word(
    segment: generate_chapters_pb2.TranscriptSegment,
    word: generate_chapters_pb2.TranscriptWord,
) -> bool:
    if not word.word_id.strip() or not word.text.strip():
        return False

    if word.start_seconds >= word.end_seconds:
        return False

    if word.start_seconds < segment.start_seconds - 1.0:
        return False

    return word.end_seconds <= segment.end_seconds + 1.0


def _failed_response(
    job_id: str,
    code: int,
    message: str,
    *,
    retryable: bool,
) -> generate_chapters_pb2.GenerateChaptersResponse:
    return generate_chapters_pb2.GenerateChaptersResponse(
        job_id=job_id,
        status=generate_chapters_pb2.GENERATE_CHAPTERS_STATUS_FAILED,
        error=generate_chapters_pb2.GenerateChaptersError(
            code=code,
            message=message,
            retryable=retryable,
        ),
    )
