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
)
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


def test_srt_timing_is_relative_to_candidate_start() -> None:
    segments = [
        _segment(0, 10, 14, "First line"),
        _segment(1, 14, 18, "Second line"),
    ]

    srt = build_srt_for_candidate(segments, start_time=10)

    assert "00:00:00,000 --> 00:00:04,000" in srt
    assert "00:00:04,000 --> 00:00:08,000" in srt
    assert "First line" in srt
