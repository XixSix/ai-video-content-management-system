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
from app.workflows.chaptering.errors import ChapterGenerationNotImplementedError
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


def _generate_request(request_id: str = "job-1") -> chaptering_pb2.GenerateChaptersRequest:
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
        options=chaptering_pb2.ChapteringOptions(max_chapters=3),
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


def test_generate_chapters_is_unimplemented_until_workflow_is_wired() -> None:
    with pytest.raises(AbortError) as error:
        ChapteringServicer().GenerateChapters(_generate_request(), _context())

    assert error.value.code == grpc.StatusCode.UNIMPLEMENTED


def test_chaptering_workflow_defines_generate_chapters_entrypoint() -> None:
    workflow = ChapteringWorkflow(embedding=NoopTextEmbeddingProvider())

    with pytest.raises(ChapterGenerationNotImplementedError):
        workflow.execute(
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
                    min_chapter_duration_seconds=60,
                    target_chapter_duration_seconds=180,
                    max_chapter_duration_seconds=180,
                    max_chapters=3,
                    use_embeddings=True,
                    use_llm=False,
                ),
            )
        )
