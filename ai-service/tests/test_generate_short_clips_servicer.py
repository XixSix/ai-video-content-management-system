# pyright: reportAttributeAccessIssue=false

from typing import cast

import grpc
import pytest

from app.grpc.generate_short_clips_servicer import GenerateShortClipsServicer
from app.providers.generate_short_clips.noop_candidate import (
    NoopGenerateShortClipsCandidateProvider,
)
from app.schemas.generate_short_clips import (
    GeneratedShortClipCandidate,
    GenerateShortClipsRequest,
    GenerateShortClipsResult,
)
from app.workflows.generate_short_clips.workflow import GenerateShortClipsWorkflow
from generate_short_clips.v1 import generate_short_clips_pb2


class AbortError(Exception):
    def __init__(self, code: grpc.StatusCode, details: str) -> None:
        self.code = code
        self.details = details
        super().__init__(details)


class FakeContext:
    def abort(self, code: grpc.StatusCode, details: str) -> None:
        raise AbortError(code, details)


class CapturingWorkflow:
    def __init__(self) -> None:
        self.request: GenerateShortClipsRequest | None = None

    def execute(
        self,
        request: GenerateShortClipsRequest,
    ) -> GenerateShortClipsResult:
        self.request = request
        return GenerateShortClipsResult(
            request_id=request.request_id,
            language=request.language,
            model="noop-generate-short-clips-v1",
            source="NOOP",
            candidates=[
                GeneratedShortClipCandidate(
                    start_segment_id="seg-1",
                    end_segment_id="seg-2",
                    source_segment_ids=["seg-1", "seg-2"],
                    start_seconds=0,
                    end_seconds=20,
                    duration_seconds=20,
                    title="Captured clip",
                    reason="Captured response.",
                    score=6.5,
                    text="Captured text.",
                )
            ],
        )


class FailingWorkflow:
    def execute(
        self,
        request: GenerateShortClipsRequest,
    ) -> GenerateShortClipsResult:
        _ = request
        raise ValueError("invalid model output")


def test_generate_short_clips_maps_request_and_response() -> None:
    workflow = CapturingWorkflow()
    response = GenerateShortClipsServicer(workflow=workflow).GenerateShortClips(
        _generate_request(),
        _context(),
    )

    assert workflow.request is not None
    assert workflow.request.request_id == "generate-short-clips-job-1"
    assert workflow.request.transcript_id is None
    assert workflow.request.transcript_version is None
    assert workflow.request.preferences.clip_count == 2
    assert workflow.request.preferences.auto_hook is True
    assert workflow.request.segments[0].segment_id == "seg-1"
    assert response.job_id == "generate-short-clips-job-1"
    assert (
        response.status
        == generate_short_clips_pb2.GENERATE_SHORT_CLIPS_STATUS_COMPLETED
    )
    assert response.model == "noop-generate-short-clips-v1"
    assert response.candidates[0].title == "Captured clip"
    assert response.candidates[0].source_segment_ids == ["seg-1", "seg-2"]


def test_generate_short_clips_returns_failed_response_for_workflow_error() -> None:
    response = GenerateShortClipsServicer(
        workflow=cast(GenerateShortClipsWorkflow, FailingWorkflow())
    ).GenerateShortClips(
        _generate_request(),
        _context(),
    )

    assert response.job_id == "generate-short-clips-job-1"
    assert (
        response.status == generate_short_clips_pb2.GENERATE_SHORT_CLIPS_STATUS_FAILED
    )
    assert (
        response.error.code
        == generate_short_clips_pb2.GENERATE_SHORT_CLIPS_ERROR_CODE_INVALID_MODEL_OUTPUT
    )
    assert response.error.retryable is False


def test_generate_short_clips_rejects_invalid_options() -> None:
    request = _generate_request()
    request.options.min_duration_seconds = 90
    request.options.max_duration_seconds = 30

    with pytest.raises(AbortError) as error:
        GenerateShortClipsServicer(workflow=CapturingWorkflow()).GenerateShortClips(
            request,
            _context(),
        )

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
    assert "min_duration_seconds" in error.value.details


def test_generate_short_clips_rejects_unsorted_segments() -> None:
    request = _generate_request()
    request.input.transcript.segments[0].start_seconds = 5
    request.input.transcript.segments[1].start_seconds = 4

    with pytest.raises(AbortError) as error:
        GenerateShortClipsServicer(workflow=CapturingWorkflow()).GenerateShortClips(
            request,
            _context(),
        )

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
    assert "sorted" in error.value.details


def test_noop_workflow_returns_deterministic_candidates() -> None:
    workflow = GenerateShortClipsWorkflow(
        candidate_provider=NoopGenerateShortClipsCandidateProvider(
            model_name="noop-generate-short-clips-v1"
        )
    )
    response = GenerateShortClipsServicer(workflow=workflow).GenerateShortClips(
        _generate_request(),
        _context(),
    )

    assert (
        response.status
        == generate_short_clips_pb2.GENERATE_SHORT_CLIPS_STATUS_COMPLETED
    )
    assert response.candidates
    assert response.candidates[0].start_segment_id == "seg-1"
    assert response.candidates[0].end_segment_id == "seg-2"
    assert (
        response.candidates[0].end_seconds - response.candidates[0].start_seconds == 20
    )


def _context() -> grpc.ServicerContext:
    return cast(grpc.ServicerContext, FakeContext())


def _generate_request() -> generate_short_clips_pb2.GenerateShortClipsRequest:
    return generate_short_clips_pb2.GenerateShortClipsRequest(
        job_id="generate-short-clips-job-1",
        input=generate_short_clips_pb2.GenerateShortClipsInput(
            transcript=generate_short_clips_pb2.TranscriptInput(
                language="en",
                media_duration_seconds=60,
                segments=[
                    generate_short_clips_pb2.TranscriptSegment(
                        segment_id="seg-1",
                        start_seconds=0,
                        end_seconds=10,
                        text="This starts the clip with a clear setup.",
                    ),
                    generate_short_clips_pb2.TranscriptSegment(
                        segment_id="seg-2",
                        start_seconds=10,
                        end_seconds=20,
                        text="This completes the short clip idea.",
                    ),
                ],
            )
        ),
        options=generate_short_clips_pb2.GenerateShortClipsOptions(
            clip_count=2,
            min_duration_seconds=15,
            max_duration_seconds=30,
            aspect_ratio="9:16",
            genre="TUTORIAL",
            tone="informative",
            prompt="Prefer concise educational clips.",
            llm=generate_short_clips_pb2.LLMOptions(enabled=True),
        ),
    )
