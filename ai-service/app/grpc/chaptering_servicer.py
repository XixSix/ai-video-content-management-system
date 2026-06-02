# pyright: reportAttributeAccessIssue=false

import grpc

from app.proto_path import ensure_proto_generated_on_path
from app.runtime.container import build_chaptering_workflow
from app.schemas.chaptering import (
    ChapterBoundaryScores,
    ChapterGenerationRequest,
    ChapterGenerationResult,
    ChapteringOptions,
    ChapteringTranscriptSegment,
)
from app.workflows.chaptering.workflow import ChapteringWorkflow

ensure_proto_generated_on_path()

from chaptering.v1 import chaptering_pb2, chaptering_pb2_grpc  # type: ignore # noqa: E402


class ChapteringServicer(chaptering_pb2_grpc.ChapteringServiceServicer):
    def __init__(
        self,
        workflow: ChapteringWorkflow | None = None,
    ) -> None:
        self._workflow = workflow or build_chaptering_workflow()

    def GenerateChapters(
        self,
        request: chaptering_pb2.GenerateChaptersRequest,
        context: grpc.ServicerContext,
    ) -> chaptering_pb2.GenerateChaptersResponse:
        self._validate_request(request, context)
        workflow_request = self._map_request(request)

        result = self._workflow.execute(workflow_request)
        return self._map_response(result)

    def _validate_request(
        self,
        request: chaptering_pb2.GenerateChaptersRequest,
        context: grpc.ServicerContext,
    ) -> None:
        request_id = request.request_id.strip()

        if not request_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "request_id is required")

        if not request.segments:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "segments are required")

        if request.media_duration_seconds <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "media_duration_seconds must be greater than 0",
            )

        previous_start = -1.0
        for index, segment in enumerate(request.segments):
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
            if not segment.text.strip():
                context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    f"segments[{index}].text is required",
                )
            previous_start = segment.start_seconds

        if request.options.max_chapters <= 0:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "options.max_chapters must be greater than 0",
            )

    def _map_request(
        self,
        request: chaptering_pb2.GenerateChaptersRequest,
    ) -> ChapterGenerationRequest:
        return ChapterGenerationRequest(
            request_id=request.request_id.strip(),
            language=request.language.strip() or None,
            media_duration_seconds=request.media_duration_seconds,
            segments=[
                ChapteringTranscriptSegment(
                    segment_id=segment.segment_id.strip(),
                    start_seconds=segment.start_seconds,
                    end_seconds=segment.end_seconds,
                    text=segment.text.strip(),
                    clean_text=segment.clean_text.strip() or None,
                    speaker_label=segment.speaker_label.strip() or None,
                    confidence=segment.confidence,
                )
                for segment in request.segments
            ],
            options=ChapteringOptions(
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
                use_embeddings=request.options.use_embeddings,
                use_llm=request.options.use_llm,
            ),
        )

    def _map_response(
        self,
        result: ChapterGenerationResult,
    ) -> chaptering_pb2.GenerateChaptersResponse:
        return chaptering_pb2.GenerateChaptersResponse(
            request_id=result.request_id,
            language=result.language or "",
            model=result.model,
            source=_map_source(result.source),
            chapters=[
                chaptering_pb2.GeneratedChapter(
                    index=chapter.index,
                    start_seconds=chapter.start_seconds,
                    end_seconds=chapter.end_seconds,
                    title=chapter.title,
                    summary=chapter.summary or "",
                    score=chapter.score or 0.0,
                    scores=_map_scores(chapter.scores),
                )
                for chapter in result.chapters
            ],
        )


def _map_source(source: str) -> int:
    if source == "RULE_BASED":
        return chaptering_pb2.CHAPTER_SOURCE_RULE_BASED
    if source == "LLM":
        return chaptering_pb2.CHAPTER_SOURCE_LLM

    return chaptering_pb2.CHAPTER_SOURCE_UNSPECIFIED


def _map_scores(
    scores: ChapterBoundaryScores,
) -> chaptering_pb2.BoundaryScores:
    return chaptering_pb2.BoundaryScores(
        score=scores.score or 0.0,
        boundary_score=scores.boundary_score or 0.0,
        semantic_shift_score=scores.semantic_shift_score or 0.0,
        lexical_shift_score=scores.lexical_shift_score or 0.0,
        valley_depth_score=scores.valley_depth_score or 0.0,
        discourse_marker_score=scores.discourse_marker_score or 0.0,
        pause_score=scores.pause_score or 0.0,
        duration_score=scores.duration_score or 0.0,
        boundary_quality_score=scores.boundary_quality_score or 0.0,
        llm_confidence_score=scores.llm_confidence_score or 0.0,
    )
