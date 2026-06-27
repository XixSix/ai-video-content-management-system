from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.db.processsing_job import JobStatus
from app.schemas.jobs.short_clip_message import (
    ShortClipJobMessage,
    ShortClipJobResultMessage,
)
from app.schemas.short_clip.output import (
    ShortClipAssetSummary,
    ShortClipCandidateSummary,
    ShortClipCompletedOutput,
    ShortClipSummary,
)

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")
CANDIDATE_ID = UUID("00000000-0000-4000-8000-000000000005")
SHORT_CLIP_ID = UUID("00000000-0000-4000-8000-000000000006")
ASSET_ID = UUID("00000000-0000-4000-8000-000000000007")


def _payload() -> dict[str, object]:
    return {
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "preferences": {
            "transcriptId": str(TRANSCRIPT_ID),
            "transcriptVersion": 2,
            "clipCount": 3,
            "clipLength": "AUTO",
            "minDuration": 20,
            "maxDuration": 60,
            "aspectRatio": "9:16",
            "language": "AUTO",
            "genre": "AUTO",
            "clipModel": "AUTO",
            "autoHook": True,
            "prompt": "",
            "captionPresetId": "karaoke",
            "burnSubtitle": True,
        },
        "taskName": "generate_short_clips",
    }


def test_short_clip_job_message_is_strict() -> None:
    message = ShortClipJobMessage.model_validate(_payload())

    assert message.job_id == JOB_ID
    assert message.preferences.aspect_ratio == "9:16"

    with pytest.raises(ValidationError):
        ShortClipJobMessage.model_validate({**_payload(), "extra": True})

    with pytest.raises(ValidationError):
        ShortClipJobMessage.model_validate({**_payload(), "taskName": "wrong"})


def test_short_clip_result_message_has_stable_shape() -> None:
    result = ShortClipJobResultMessage(
        job_id=JOB_ID,
        media_id=MEDIA_ID,
        user_id=USER_ID,
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        status=JobStatus.COMPLETED,
        skipped=False,
    ).model_dump(mode="json", by_alias=True)

    assert result == {
        "type": "short_clip.job.result",
        "version": 1,
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "status": "COMPLETED",
        "skipped": False,
    }


def test_completed_output_shape() -> None:
    output = ShortClipCompletedOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        candidate_ids=[CANDIDATE_ID],
        short_clip_ids=[SHORT_CLIP_ID],
        asset_ids=[ASSET_ID],
        candidates=[
            ShortClipCandidateSummary(
                id=CANDIDATE_ID,
                start_time=10,
                end_time=40,
                duration=30,
                title="Useful moment",
                score=8.5,
            )
        ],
        short_clips=[
            ShortClipSummary(
                id=SHORT_CLIP_ID,
                candidate_id=CANDIDATE_ID,
                status="READY",
            )
        ],
        assets=[
            ShortClipAssetSummary(
                id=ASSET_ID,
                asset_type="SHORT_CLIP_VIDEO",
                s3_bucket="vidpilot-media",
                s3_key="generated/short-clips/video.mp4",
            )
        ],
    ).model_dump(mode="json", by_alias=True)

    assert output["type"] == "short_clip.completed"
    assert output["candidateIds"] == [str(CANDIDATE_ID)]
    assert output["shortClipIds"] == [str(SHORT_CLIP_ID)]
    assert output["assetIds"] == [str(ASSET_ID)]
