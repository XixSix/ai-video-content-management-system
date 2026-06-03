# pyright: reportAttributeAccessIssue=false

from typing import cast

import grpc
import pytest

from app.grpc.chaptering_servicer import ChapteringServicer
from app.providers.chaptering.noop_embedding import NoopTextEmbeddingProvider
from app.schemas.chaptering import (
    ChapterGenerationRequest,
    ChapteringOptions,
    ChapteringTranscriptSegment,
)
from app.workflows.chaptering.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    ChapteringPipelineConfig,
)
from app.workflows.chaptering.workflow import ChapteringWorkflow
from chaptering.v1 import chaptering_pb2


class AbortError(Exception):
    def __init__(self, code: grpc.StatusCode, details: str) -> None:
        self.code = code
        self.details = details
        super().__init__(details)


class FakeContext:
    def abort(self, code: grpc.StatusCode, details: str) -> None:
        raise AbortError(code, details)


def _context() -> grpc.ServicerContext:
    return cast(grpc.ServicerContext, FakeContext())


def _generate_request(
    request_id: str = "job-1",
) -> chaptering_pb2.GenerateChaptersRequest:
    return chaptering_pb2.GenerateChaptersRequest(
        request_id=request_id,
        language="en",
        media_duration_seconds=120,
        segments=[
            chaptering_pb2.TranscriptSegment(
                segment_id="seg-1",
                start_seconds=0,
                end_seconds=10,
                text="Topic introduction.",
            )
        ],
        options=chaptering_pb2.ChapteringOptions(
            min_chapter_duration_seconds=30,
            target_chapter_duration_seconds=60,
            max_chapter_duration_seconds=120,
            max_chapters=3,
            use_embeddings=True,
        ),
    )


def _pipeline_config() -> ChapteringPipelineConfig:
    return ChapteringPipelineConfig(
        strategy="segment",
        model_name="segment-chaptering-v1",
        target_unit_duration_seconds=20.0,
        max_unit_duration_seconds=30.0,
        target_unit_words=80,
        max_unit_words=160,
        max_unit_chars=1200,
        pause_boundary_seconds=1.0,
        punctuation_poor_threshold=0.15,
        context_window_seconds=90.0,
        scoring=CandidateScoringConfig(
            context_seconds=90.0,
            long_pause_seconds=1.0,
            max_pause_score_seconds=5.0,
            min_context_text_chars=120,
            discourse_marker_weight=0.30,
            pause_weight=0.25,
            lexical_shift_weight=0.20,
            boundary_quality_weight=0.15,
            duration_sanity_weight=0.10,
        ),
        retention=CandidateRetentionConfig(
            min_limit=12,
            max_limit=40,
            multiplier=4,
            top_score_fraction=0.60,
        ),
    )


def test_generate_chapters_rejects_missing_request_id() -> None:
    request = _generate_request(request_id="")

    with pytest.raises(AbortError) as error:
        ChapteringServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_missing_segments() -> None:
    request = _generate_request()
    request.ClearField("segments")

    with pytest.raises(AbortError) as error:
        ChapteringServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_invalid_segment_timestamps() -> None:
    request = _generate_request()
    request.segments[0].end_seconds = 0

    with pytest.raises(AbortError) as error:
        ChapteringServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_invalid_media_duration() -> None:
    request = _generate_request()
    request.media_duration_seconds = 0

    with pytest.raises(AbortError) as error:
        ChapteringServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_unsorted_segments() -> None:
    request = _generate_request()
    request.segments[0].start_seconds = 10
    request.segments[0].end_seconds = 20
    request.segments.extend(
        [
            chaptering_pb2.TranscriptSegment(
                segment_id="seg-2",
                start_seconds=5,
                end_seconds=15,
                text="Earlier segment.",
            )
        ]
    )

    with pytest.raises(AbortError) as error:
        ChapteringServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_segment_beyond_media_duration() -> None:
    request = _generate_request()
    request.segments[0].end_seconds = 122

    with pytest.raises(AbortError) as error:
        ChapteringServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_returns_fallback_chapter() -> None:
    response = ChapteringServicer().GenerateChapters(_generate_request(), _context())

    assert response.request_id == "job-1"
    assert response.source == chaptering_pb2.CHAPTER_SOURCE_RULE_BASED
    assert response.model == "segment-chaptering-v1"
    assert len(response.chapters) == 1
    assert response.chapters[0].start_seconds == 0
    assert response.chapters[0].end_seconds == 120
    assert response.chapters[0].title == "Topic introduction."


def test_chaptering_workflow_generates_chapters() -> None:
    workflow = ChapteringWorkflow(
        embedding=NoopTextEmbeddingProvider(),
        config=_pipeline_config(),
    )

    result = workflow.execute(
        ChapterGenerationRequest(
            request_id="job-1",
            language="en",
            media_duration_seconds=120,
            segments=[
                ChapteringTranscriptSegment(
                    segment_id="seg-1",
                    start_seconds=0,
                    end_seconds=10,
                    text="Topic introduction.",
                )
            ],
            options=ChapteringOptions(
                min_chapter_duration_seconds=30,
                target_chapter_duration_seconds=60,
                max_chapter_duration_seconds=60,
                max_chapters=3,
                use_embeddings=True,
                use_llm=False,
            ),
        )
    )

    assert result.request_id == "job-1"
    assert len(result.chapters) == 1
    assert result.chapters[0].title == "Topic introduction."
