# pyright: reportAttributeAccessIssue=false

from typing import cast

import grpc
import pytest

from app.grpc.generate_chapters_servicer import GenerateChaptersServicer
from app.providers.generate_chapters.noop_boundary_evaluation import (
    NoopChapterBoundaryEvaluationProvider,
)
from app.providers.generate_chapters.noop_embedding import NoopTextEmbeddingProvider
from app.providers.generate_chapters.noop_title import NoopChapterTitleProvider
from app.schemas.generate_chapters import (
    GenerateChaptersRequest,
    GenerateChaptersResult,
    GenerateChaptersOptions,
    GenerateChaptersTranscriptSegment,
    GenerateChaptersTranscriptWord,
    GeneratedChapter,
)
from app.workflows.generate_chapters.schemas import (
    CandidateRetentionConfig,
    CandidateScoringConfig,
    GenerateChaptersPipelineConfig,
    UnitRepairConfig,
    ValleyDetectionConfig,
)
from app.workflows.generate_chapters.workflow import GenerateChaptersWorkflow
from generate_chapters.v1 import generate_chapters_pb2


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


class CapturingWorkflow:
    def __init__(self) -> None:
        self.request: GenerateChaptersRequest | None = None

    def execute(self, request: GenerateChaptersRequest) -> GenerateChaptersResult:
        self.request = request
        return GenerateChaptersResult(
            request_id=request.request_id,
            language=request.language,
            model="segment-generate-chapters-v1",
            source="RULE_BASED",
            chapters=[
                GeneratedChapter(
                    index=1,
                    start_seconds=0,
                    end_seconds=request.media_duration_seconds or 0,
                    title="Captured",
                )
            ],
        )


class FailingWorkflow:
    def execute(self, request: GenerateChaptersRequest) -> GenerateChaptersResult:
        _ = request
        raise ValueError("invalid transcript")


def _generate_request(
    request_id: str = "job-1",
) -> generate_chapters_pb2.GenerateChaptersRequest:
    return generate_chapters_pb2.GenerateChaptersRequest(
        job_id=request_id,
        transcript=generate_chapters_pb2.TranscriptInput(
            language="en",
            media_duration_seconds=120,
            segments=[
                generate_chapters_pb2.TranscriptSegment(
                    segment_id="seg-1",
                    start_seconds=0,
                    end_seconds=10,
                    text="Topic introduction.",
                )
            ],
        ),
        options=generate_chapters_pb2.GenerateChaptersOptions(
            min_chapter_duration_seconds=30,
            target_chapter_duration_seconds=60,
            max_chapter_duration_seconds=120,
            max_chapters=3,
            embeddings=generate_chapters_pb2.EmbeddingOptions(enabled=True),
        ),
    )


def _pipeline_config(strategy: str = "segment") -> GenerateChaptersPipelineConfig:
    return GenerateChaptersPipelineConfig(
        strategy=strategy,
        model_name="segment-generate-chapters-v1",
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
        valley=ValleyDetectionConfig(
            smoothing_radius=1,
            peak_window=2,
            min_valley_depth=0.18,
            semantic_weight=0.70,
        ),
        retention=CandidateRetentionConfig(
            min_limit=12,
            max_limit=40,
            multiplier=4,
            top_score_fraction=0.60,
        ),
        unit_repair=UnitRepairConfig(
            short_duration_seconds=4.0,
            min_words=8,
            fragment_max_words=2,
            sparse_duration_seconds=6.0,
            continuation_gap_seconds=0.05,
        ),
    )


def test_generate_chapters_rejects_missing_request_id() -> None:
    request = _generate_request(request_id="")

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_missing_segments() -> None:
    request = _generate_request()
    request.transcript.ClearField("segments")

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_invalid_segment_timestamps() -> None:
    request = _generate_request()
    request.transcript.segments[0].end_seconds = 0

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_invalid_media_duration() -> None:
    request = _generate_request()
    request.transcript.media_duration_seconds = 0

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_unsorted_segments() -> None:
    request = _generate_request()
    request.transcript.segments[0].start_seconds = 10
    request.transcript.segments[0].end_seconds = 20
    request.transcript.segments.extend(
        [
            generate_chapters_pb2.TranscriptSegment(
                segment_id="seg-2",
                start_seconds=5,
                end_seconds=15,
                text="Earlier segment.",
            )
        ]
    )

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_segment_beyond_media_duration() -> None:
    request = _generate_request()
    request.transcript.segments[0].end_seconds = 122

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT


def test_generate_chapters_rejects_empty_transcript_text() -> None:
    request = _generate_request()
    request.transcript.segments[0].text = " "

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
    assert "transcript text is empty" in error.value.details


def test_generate_chapters_rejects_missing_segment_id() -> None:
    request = _generate_request()
    request.transcript.segments[0].segment_id = " "

    with pytest.raises(AbortError) as error:
        GenerateChaptersServicer().GenerateChapters(request, _context())

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
    assert "segment_id" in error.value.details


def test_generate_chapters_returns_failed_response_for_workflow_error() -> None:
    response = GenerateChaptersServicer(
        workflow=cast(GenerateChaptersWorkflow, FailingWorkflow())
    ).GenerateChapters(
        _generate_request(),
        _context(),
    )

    assert response.job_id == "job-1"
    assert response.status == generate_chapters_pb2.GENERATE_CHAPTERS_STATUS_FAILED
    assert (
        response.error.code
        == generate_chapters_pb2.GENERATE_CHAPTERS_ERROR_CODE_INVALID_TRANSCRIPT
    )
    assert response.error.retryable is False


def test_generate_chapters_drops_invalid_word_timestamps() -> None:
    request = _generate_request()
    request.transcript.segments[0].words.extend(
        [
            generate_chapters_pb2.TranscriptWord(
                word_id="word-1",
                start_seconds=2,
                end_seconds=1,
                text="Topic",
            )
        ]
    )
    workflow = CapturingWorkflow()

    GenerateChaptersServicer(
        workflow=cast(GenerateChaptersWorkflow, workflow)
    ).GenerateChapters(
        request,
        _context(),
    )

    assert workflow.request is not None
    assert workflow.request.segments[0].words == []


def test_generate_chapters_maps_word_timestamps_to_workflow_request() -> None:
    request = _generate_request()
    request.transcript.segments[0].words.extend(
        [
            generate_chapters_pb2.TranscriptWord(
                word_id="word-1",
                start_seconds=0,
                end_seconds=0.5,
                text="Topic",
            ),
            generate_chapters_pb2.TranscriptWord(
                word_id="word-2",
                start_seconds=0.5,
                end_seconds=1.0,
                text="introduction",
            ),
        ]
    )
    workflow = CapturingWorkflow()

    GenerateChaptersServicer(
        workflow=cast(GenerateChaptersWorkflow, workflow)
    ).GenerateChapters(
        request,
        _context(),
    )

    assert workflow.request is not None
    words = workflow.request.segments[0].words
    assert len(words) == 2
    assert words[0].word_id == "word-1"
    assert words[0].segment_id == "seg-1"
    assert words[0].start_seconds == 0
    assert words[0].end_seconds == 0.5
    assert words[0].text == "Topic"
    assert words[0].confidence is None


def test_generate_chapters_filters_mixed_word_alignment() -> None:
    request = _generate_request()
    request.transcript.segments[0].words.extend(
        [
            generate_chapters_pb2.TranscriptWord(
                word_id="word-1",
                start_seconds=0,
                end_seconds=0,
                text="Topic",
            ),
            generate_chapters_pb2.TranscriptWord(
                word_id="word-2",
                start_seconds=0.5,
                end_seconds=1.0,
                text="introduction",
            ),
        ]
    )
    workflow = CapturingWorkflow()

    GenerateChaptersServicer(
        workflow=cast(GenerateChaptersWorkflow, workflow)
    ).GenerateChapters(
        request,
        _context(),
    )

    assert workflow.request is not None
    words = workflow.request.segments[0].words
    assert len(words) == 1
    assert words[0].word_id == "word-2"


def test_generate_chapters_returns_fallback_chapter() -> None:
    response = GenerateChaptersServicer().GenerateChapters(
        _generate_request(), _context()
    )

    assert response.job_id == "job-1"
    assert response.status == generate_chapters_pb2.GENERATE_CHAPTERS_STATUS_COMPLETED
    assert response.source == generate_chapters_pb2.CHAPTER_SOURCE_SEGMENTS
    assert response.model == "segment-generate-chapters-v1"
    assert len(response.chapters) == 1
    assert response.chapters[0].start_seconds == 0
    assert response.chapters[0].title == "Topic introduction."


def test_generate_chapters_workflow_generates_chapters() -> None:
    workflow = GenerateChaptersWorkflow(
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(),
    )

    result = workflow.execute(
        GenerateChaptersRequest(
            request_id="job-1",
            language="en",
            media_duration_seconds=120,
            segments=[
                GenerateChaptersTranscriptSegment(
                    segment_id="seg-1",
                    start_seconds=0,
                    end_seconds=10,
                    text="Topic introduction.",
                )
            ],
            options=GenerateChaptersOptions(
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


def test_generate_chapters_workflow_generates_chapters_from_word_strategy() -> None:
    workflow = GenerateChaptersWorkflow(
        embedding=NoopTextEmbeddingProvider(),
        boundary_evaluator=NoopChapterBoundaryEvaluationProvider(),
        title_provider=NoopChapterTitleProvider(),
        config=_pipeline_config(strategy="word"),
    )

    result = workflow.execute(
        GenerateChaptersRequest(
            request_id="job-1",
            language="en",
            media_duration_seconds=120,
            segments=[
                GenerateChaptersTranscriptSegment(
                    segment_id="seg-1",
                    start_seconds=0,
                    end_seconds=10,
                    text="Topic introduction.",
                    words=[
                        GenerateChaptersTranscriptWord(
                            word_id="word-1",
                            segment_id="seg-1",
                            start_seconds=0,
                            end_seconds=0.5,
                            text="Topic",
                        ),
                        GenerateChaptersTranscriptWord(
                            word_id="word-2",
                            segment_id="seg-1",
                            start_seconds=0.5,
                            end_seconds=1.0,
                            text="introduction.",
                        ),
                    ],
                )
            ],
            options=GenerateChaptersOptions(
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
