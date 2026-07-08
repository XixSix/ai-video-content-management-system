from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.db.processsing_job import JobStatus
from app.schemas.jobs.generate_short_clips_message import (
    GenerateShortClipsJobMessage,
    GenerateShortClipsJobResultMessage,
)
from app.schemas.short_clip.input import (
    GenerateShortClipsJobInput,
    GenerateShortClipsOptions,
)
from app.schemas.short_clip.output import GenerateShortClipsJobOutput

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")
CANDIDATE_ID = UUID("00000000-0000-4000-8000-000000000005")
SHORT_CLIP_ID = UUID("00000000-0000-4000-8000-000000000006")
ASSET_ID = UUID("00000000-0000-4000-8000-000000000007")


def _payload() -> dict[str, object]:
    return {
        "version": 1,
        "jobId": str(JOB_ID),
        "jobType": "GENERATE_SHORT_CLIPS",
        "taskName": "generate_short_clips",
    }


def _options() -> GenerateShortClipsOptions:
    return GenerateShortClipsOptions.model_validate(
        {
            "clipCount": 3,
            "minDuration": 20,
            "maxDuration": 60,
            "aspectRatio": "9:16",
            "platform": "YOUTUBE_SHORTS",
            "genre": "AUTO",
            "tone": "AUTO",
            "language": "auto",
            "prompt": "",
            "llm": {"enabled": True, "model": None},
            "captionPresetId": "karaoke",
            "burnSubtitle": True,
        }
    )


def _job_input() -> GenerateShortClipsJobInput:
    return GenerateShortClipsJobInput.model_validate(
        {
            "transcriptId": str(TRANSCRIPT_ID),
            "transcriptVersion": 2,
            "options": _options().model_dump(mode="json", by_alias=True),
        }
    )


def test_short_clip_job_message_is_strict() -> None:
    message = GenerateShortClipsJobMessage.model_validate(_payload())

    assert message.job_id == JOB_ID

    with pytest.raises(ValidationError):
        GenerateShortClipsJobMessage.model_validate({**_payload(), "extra": True})

    with pytest.raises(ValidationError):
        GenerateShortClipsJobMessage.model_validate({**_payload(), "taskName": "wrong"})

    with pytest.raises(ValidationError):
        GenerateShortClipsJobMessage.model_validate(
            {
                **_payload(),
                "input": _job_input().model_dump(mode="json", by_alias=True),
            }
        )


def test_short_clip_job_input_has_stable_shape() -> None:
    job_input = _job_input().model_dump(mode="json", by_alias=True)

    assert job_input == {
        "type": "generate_short_clips.job.input",
        "version": 1,
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "options": {
            "clipCount": 3,
            "minDuration": 20.0,
            "maxDuration": 60.0,
            "aspectRatio": "9:16",
            "platform": "YOUTUBE_SHORTS",
            "genre": "AUTO",
            "tone": "AUTO",
            "language": "auto",
            "prompt": "",
            "llm": {"enabled": True, "model": None},
            "burnSubtitle": True,
            "captionPresetId": "karaoke",
        },
    }


def test_short_clip_result_message_has_stable_shape() -> None:
    result = GenerateShortClipsJobResultMessage(
        jobId=JOB_ID,
        mediaId=MEDIA_ID,
        userId=USER_ID,
        transcriptId=TRANSCRIPT_ID,
        transcriptVersion=2,
        status=JobStatus.COMPLETED,
        skipped=False,
    ).model_dump(mode="json", by_alias=True)

    assert result == {
        "type": "generate_short_clips.job.result",
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
    output = GenerateShortClipsJobOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        candidate_count=1,
        short_clip_count=1,
        asset_count=1,
        candidate_ids=[CANDIDATE_ID],
        short_clip_ids=[SHORT_CLIP_ID],
        asset_ids=[ASSET_ID],
    ).model_dump(mode="json", by_alias=True)

    assert output["type"] == "generate_short_clips.job.output"
    assert output["candidateCount"] == 1
    assert output["shortClipCount"] == 1
    assert output["assetCount"] == 1
    assert output["candidateIds"] == [str(CANDIDATE_ID)]
    assert output["shortClipIds"] == [str(SHORT_CLIP_ID)]
    assert output["assetIds"] == [str(ASSET_ID)]
