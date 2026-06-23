from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.db.processsing_job import JobType
from app.schemas.jobs.media_preview_message import MediaPreviewJobMessage

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000003")
USER_ID = UUID("00000000-0000-4000-8000-000000000004")


def _payload(**overrides: object) -> dict[str, object]:
    return {
        "jobId": str(JOB_ID),
        "jobType": "GENERATE_THUMBNAIL",
        "mediaId": str(MEDIA_ID),
        "workspaceId": str(WORKSPACE_ID),
        "userId": str(USER_ID),
        "s3Bucket": "source-media",
        "s3Key": "uploads/video.mp4",
        "mediaType": "VIDEO",
        "mimeType": "video/mp4",
        "taskName": "generate_thumbnail",
        **overrides,
    }


@pytest.mark.parametrize(
    ("job_type", "task_name", "media_type"),
    [
        ("GENERATE_THUMBNAIL", "generate_thumbnail", "VIDEO"),
        (
            "GENERATE_THUMBNAIL_SPRITE",
            "generate_thumbnail_sprite",
            "VIDEO",
        ),
        ("GENERATE_WAVEFORM_PEAK", "generate_waveform_peak", "VIDEO"),
        ("GENERATE_WAVEFORM_PEAK", "generate_waveform_peak", "AUDIO"),
    ],
)
def test_media_preview_message_accepts_supported_contracts(
    job_type: str,
    task_name: str,
    media_type: str,
) -> None:
    message = MediaPreviewJobMessage.model_validate(
        _payload(
            jobType=job_type,
            taskName=task_name,
            mediaType=media_type,
        )
    )

    assert message.job_type == JobType(job_type)


def test_media_preview_message_rejects_mismatched_task_name() -> None:
    with pytest.raises(ValidationError, match="does not match jobType"):
        MediaPreviewJobMessage.model_validate(
            _payload(taskName="generate_waveform_peak")
        )


def test_media_preview_message_rejects_thumbnail_for_audio() -> None:
    with pytest.raises(ValidationError, match="requires VIDEO"):
        MediaPreviewJobMessage.model_validate(_payload(mediaType="AUDIO"))


def test_media_preview_message_forbids_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        MediaPreviewJobMessage.model_validate(_payload(unknown=True))
