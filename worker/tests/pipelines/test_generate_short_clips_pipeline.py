from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db.short_clip_repository import (
    ShortClipChapter,
    ShortClipMedia,
    ShortClipSource,
    ShortClipTranscript,
    ShortClipTranscriptSegment,
)
from app.pipelines.generate_short_clips.pipeline import (
    TerminalGenerateShortClipsPipelineError,
    _validate_source,
    build_srt_for_candidate,
    generate_clip_candidates,
    run_generate_short_clips_pipeline,
)
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.short_clip.input import GenerateShortClipsOptions
from app.schemas.short_clip.result import ShortClipCandidateResult
from app.services.ai_service import AIServiceTerminalError

MEDIA_ID = UUID("00000000-0000-4000-8000-000000000001")
USER_ID = UUID("00000000-0000-4000-8000-000000000002")
WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _options(**overrides: object) -> GenerateShortClipsOptions:
    return GenerateShortClipsOptions.model_validate(
        {
            "clipCount": 2,
            "minDuration": 20,
            "maxDuration": 45,
            "aspectRatio": "9:16",
            "platform": "YOUTUBE_SHORTS",
            "genre": "AUTO",
            "tone": "AUTO",
            "language": "auto",
            "prompt": "",
            "llm": {"enabled": True, "model": None},
            "captionPresetId": "karaoke",
            "burnSubtitle": True,
            **overrides,
        }
    )


def _segment(
    index: int, start: float, end: float, text: str
) -> ShortClipTranscriptSegment:
    return ShortClipTranscriptSegment(
        id=UUID(f"00000000-0000-4000-8000-{index + 10:012d}"),
        segment_index=index,
        start_time=start,
        end_time=end,
        text=text,
        clean_text=text.lower(),
    )


def _source() -> ShortClipSource:
    return ShortClipSource(
        media=ShortClipMedia(
            id=MEDIA_ID,
            user_id=USER_ID,
            workspace_id=WORKSPACE_ID,
            media_type="VIDEO",
            s3_bucket="vidpilot-media",
            s3_key="uploads/source.mp4",
            s3_region="ap-southeast-1",
            duration=120,
            width=1920,
            height=1080,
            mime_type="video/mp4",
        ),
        transcript=ShortClipTranscript(
            id=TRANSCRIPT_ID,
            media_id=MEDIA_ID,
            language="en",
            version=2,
        ),
        project_id=None,
        segments=[
            _segment(0, 0, 12, "The first setup line opens the idea."),
            _segment(1, 12, 25, "This moment explains the payoff clearly."),
            _segment(2, 25, 40, "The speaker lands a useful takeaway."),
            _segment(3, 40, 65, "A second possible clip starts here."),
        ],
        chapters=[
            ShortClipChapter(
                id=UUID("00000000-0000-4000-8000-000000000099"),
                start_time=0,
                end_time=65,
                title="Main idea",
            )
        ],
    )


def _job() -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": "00000000-0000-4000-8000-000000000098",
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "jobType": JobType.GENERATE_SHORT_CLIPS,
            "status": JobStatus.QUEUED,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": "generate_short_clips_queue",
            "taskName": "generate_short_clips",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": None,
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def test_validate_source_rejects_stale_transcript_version() -> None:
    try:
        _validate_source(_source(), _job(), transcript_version=3)
    except TerminalGenerateShortClipsPipelineError as error:
        assert error.error_code == "TRANSCRIPT_VERSION_MISMATCH"
    else:
        raise AssertionError("Expected stale transcript version to be rejected")


def test_generate_clip_candidates_uses_ai_service(monkeypatch) -> None:
    source = _source()
    expected = ShortClipCandidateResult(
        start_segment_id=source.segments[0].id,
        end_segment_id=source.segments[1].id,
        source_segment_ids=[source.segments[0].id, source.segments[1].id],
        start_time=0,
        end_time=25,
        duration=25,
        title="AI candidate",
        reason="Selected by ai-service.",
        score=9.2,
        text="The first setup line opens the idea. This moment explains the payoff clearly.",
        provider="NOOP",
        model="noop-short-clip-v1",
    )

    class FakeAIServiceClient:
        def generate_short_clip_candidates(
            self, **kwargs: object
        ) -> list[ShortClipCandidateResult]:
            assert kwargs["request_id"] == "job-1"
            assert kwargs["source"] == source
            return [expected]

    monkeypatch.setattr(
        "app.pipelines.generate_short_clips.pipeline.ai_service_client",
        FakeAIServiceClient(),
    )

    candidates = generate_clip_candidates("job-1", source, _options())

    assert candidates == [expected]


def test_generate_clip_candidates_raises_when_ai_service_unavailable(
    monkeypatch,
) -> None:
    class UnavailableAIServiceClient:
        def generate_short_clip_candidates(
            self, **kwargs: object
        ) -> list[ShortClipCandidateResult]:
            raise RuntimeError("ai-service unavailable")

    monkeypatch.setattr(
        "app.pipelines.generate_short_clips.pipeline.ai_service_client",
        UnavailableAIServiceClient(),
    )

    try:
        generate_clip_candidates("job-1", _source(), _options())
    except RuntimeError as error:
        assert str(error) == "ai-service unavailable"
    else:
        raise AssertionError("Expected ai-service failure to bubble")


def test_run_generate_short_clips_pipeline_converts_ai_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def generate_clip_candidates_failure(*args: object, **kwargs: object) -> object:
        raise AIServiceTerminalError(
            "ai-service rejected short clip request",
            error_code="AI_SERVICE_INVALID_RESPONSE",
        )

    monkeypatch.setattr(
        "app.pipelines.generate_short_clips.pipeline.get_db_session", _session
    )
    monkeypatch.setattr(
        "app.pipelines.generate_short_clips.pipeline.short_clip_repository.load_short_clip_source",
        lambda *args, **kwargs: _source(),
    )
    monkeypatch.setattr(
        "app.pipelines.generate_short_clips.pipeline.generate_clip_candidates",
        generate_clip_candidates_failure,
    )

    with pytest.raises(TerminalGenerateShortClipsPipelineError) as error:
        run_generate_short_clips_pipeline(
            _job(),
            transcript_id=str(TRANSCRIPT_ID),
            transcript_version=2,
            options=_options(),
        )

    assert error.value.error_code == "AI_SERVICE_INVALID_RESPONSE"


def test_srt_timing_is_relative_to_candidate_start() -> None:
    segments = [
        _segment(0, 10, 14, "First line"),
        _segment(1, 14, 18, "Second line"),
    ]

    srt = build_srt_for_candidate(segments, start_time=10)

    assert "00:00:00,000 --> 00:00:04,000" in srt
    assert "00:00:04,000 --> 00:00:08,000" in srt
    assert "First line" in srt
