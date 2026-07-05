from uuid import UUID

from app.db.short_clip_repository import (
    ShortClipChapter,
    ShortClipMedia,
    ShortClipSource,
    ShortClipTranscript,
    ShortClipTranscriptSegment,
)
from app.pipelines.short_clip.pipeline import (
    build_fake_clip_candidates,
    build_srt_for_candidate,
    generate_clip_candidates,
)
from app.schemas.short_clip.result import ShortClipCandidateResult
from app.schemas.jobs.short_clip_message import ShortClipJobPreferences

MEDIA_ID = UUID("00000000-0000-4000-8000-000000000001")
USER_ID = UUID("00000000-0000-4000-8000-000000000002")
WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


def _preferences(**overrides: object) -> ShortClipJobPreferences:
    return ShortClipJobPreferences.model_validate(
        {
            "transcriptId": str(TRANSCRIPT_ID),
            "transcriptVersion": 2,
            "clipCount": 2,
            "clipLength": "AUTO",
            "minDuration": 20,
            "maxDuration": 45,
            "aspectRatio": "9:16",
            "language": "AUTO",
            "genre": "AUTO",
            "clipModel": "AUTO",
            "autoHook": True,
            "prompt": "",
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


def test_fake_provider_builds_duration_valid_candidates() -> None:
    candidates = build_fake_clip_candidates(_source(), _preferences())

    assert len(candidates) == 2
    assert candidates[0].start_time == 0
    assert 20 <= candidates[0].duration <= 45
    assert candidates[0].title
    assert candidates[0].score <= 10
    assert len(candidates[0].source_segment_ids) == 2


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
        "app.pipelines.short_clip.pipeline.ai_service_client",
        FakeAIServiceClient(),
    )

    candidates = generate_clip_candidates("job-1", source, _preferences())

    assert candidates == [expected]


def test_generate_clip_candidates_falls_back_when_ai_service_unavailable(
    monkeypatch,
) -> None:
    class UnavailableAIServiceClient:
        def generate_short_clip_candidates(
            self, **kwargs: object
        ) -> list[ShortClipCandidateResult]:
            raise RuntimeError("ai-service unavailable")

    monkeypatch.setattr(
        "app.pipelines.short_clip.pipeline.ai_service_client",
        UnavailableAIServiceClient(),
    )

    candidates = generate_clip_candidates("job-1", _source(), _preferences())

    assert candidates
    assert candidates[0].provider == "deterministic-fake"


def test_srt_timing_is_relative_to_candidate_start() -> None:
    segments = [
        _segment(0, 10, 14, "First line"),
        _segment(1, 14, 18, "Second line"),
    ]

    srt = build_srt_for_candidate(segments, start_time=10)

    assert "00:00:00,000 --> 00:00:04,000" in srt
    assert "00:00:04,000 --> 00:00:08,000" in srt
    assert "First line" in srt
