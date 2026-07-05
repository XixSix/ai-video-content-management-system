# pyright: reportAttributeAccessIssue=false

from typing import cast

import grpc
import pytest

from app.grpc.short_clip_servicer import ShortClipServicer
from app.providers.short_clip.noop_candidate import NoopShortClipCandidateProvider
from app.schemas.short_clip import (
    ClipCandidate,
    ShortClipGenerationRequest,
    ShortClipGenerationResult,
)
from app.workflows.short_clip.workflow import ShortClipWorkflow
from short_clip.v1 import short_clip_pb2


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
        self.request: ShortClipGenerationRequest | None = None

    def execute(
        self,
        request: ShortClipGenerationRequest,
    ) -> ShortClipGenerationResult:
        self.request = request
        return ShortClipGenerationResult(
            request_id=request.request_id,
            language=request.language,
            model="noop-short-clip-v1",
            source="NOOP",
            candidates=[
                ClipCandidate(
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


def test_generate_clip_candidates_maps_request_and_response() -> None:
    workflow = CapturingWorkflow()
    response = ShortClipServicer(workflow=workflow).GenerateClipCandidates(
        _generate_request(),
        _context(),
    )

    assert workflow.request is not None
    assert workflow.request.request_id == "short-clip-job-1"
    assert workflow.request.transcript_id == "transcript-1"
    assert workflow.request.transcript_version == 3
    assert workflow.request.preferences.clip_count == 2
    assert workflow.request.preferences.auto_hook is True
    assert workflow.request.segments[0].segment_id == "seg-1"
    assert response.request_id == "short-clip-job-1"
    assert response.model == "noop-short-clip-v1"
    assert response.source == short_clip_pb2.SHORT_CLIP_SOURCE_NOOP
    assert response.candidates[0].title == "Captured clip"
    assert response.candidates[0].source_segment_ids == ["seg-1", "seg-2"]


def test_generate_clip_candidates_rejects_invalid_preferences() -> None:
    request = _generate_request()
    request.preferences.min_duration_seconds = 90
    request.preferences.max_duration_seconds = 30

    with pytest.raises(AbortError) as error:
        ShortClipServicer(workflow=CapturingWorkflow()).GenerateClipCandidates(
            request,
            _context(),
        )

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
    assert "min_duration_seconds" in error.value.details


def test_generate_clip_candidates_rejects_unsorted_segments() -> None:
    request = _generate_request()
    request.segments[0].start_seconds = 5
    request.segments[1].start_seconds = 4

    with pytest.raises(AbortError) as error:
        ShortClipServicer(workflow=CapturingWorkflow()).GenerateClipCandidates(
            request,
            _context(),
        )

    assert error.value.code == grpc.StatusCode.INVALID_ARGUMENT
    assert "sorted" in error.value.details


def test_noop_workflow_returns_deterministic_candidates() -> None:
    workflow = ShortClipWorkflow(
        candidate_provider=NoopShortClipCandidateProvider(
            model_name="noop-short-clip-v1"
        )
    )
    response = ShortClipServicer(workflow=workflow).GenerateClipCandidates(
        _generate_request(),
        _context(),
    )

    assert response.source == short_clip_pb2.SHORT_CLIP_SOURCE_NOOP
    assert response.candidates
    assert response.candidates[0].start_segment_id == "seg-1"
    assert response.candidates[0].end_segment_id == "seg-2"
    assert response.candidates[0].duration_seconds == 20


def _context() -> grpc.ServicerContext:
    return cast(grpc.ServicerContext, FakeContext())


def _generate_request() -> short_clip_pb2.GenerateClipCandidatesRequest:
    return short_clip_pb2.GenerateClipCandidatesRequest(
        request_id="short-clip-job-1",
        transcript_id="transcript-1",
        transcript_version=3,
        language="en",
        media_duration_seconds=60,
        segments=[
            short_clip_pb2.TranscriptSegment(
                segment_id="seg-1",
                start_seconds=0,
                end_seconds=10,
                text="This starts the clip with a clear setup.",
            ),
            short_clip_pb2.TranscriptSegment(
                segment_id="seg-2",
                start_seconds=10,
                end_seconds=20,
                text="This completes the short clip idea.",
            ),
        ],
        preferences=short_clip_pb2.ShortClipPreferences(
            clip_count=2,
            clip_length="15_30",
            min_duration_seconds=15,
            max_duration_seconds=30,
            aspect_ratio="9:16",
            language="ENGLISH",
            genre="TUTORIAL",
            clip_model="BALANCED",
            auto_hook=True,
            prompt="Prefer concise educational clips.",
            caption_preset_id="karaoke",
            burn_subtitle=True,
        ),
    )
