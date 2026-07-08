from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.db.processsing_job import JobType
from app.schemas.jobs.media_preview_message import MediaPreviewJobMessage
from app.schemas.media_preview.output import MediaPreviewJobOutput

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
ASSET_ID = UUID("00000000-0000-4000-8000-000000000002")


def _payload(**overrides: object) -> dict[str, object]:
    return {
        "version": 1,
        "jobId": str(JOB_ID),
        "jobType": "GENERATE_THUMBNAIL",
        "taskName": "generate_thumbnail",
        **overrides,
    }


@pytest.mark.parametrize(
    ("job_type", "task_name"),
    [
        ("GENERATE_THUMBNAIL", "generate_thumbnail"),
        (
            "GENERATE_THUMBNAIL_SPRITE",
            "generate_thumbnail_sprite",
        ),
        ("GENERATE_WAVEFORM_PEAK", "generate_waveform_peak"),
    ],
)
def test_media_preview_message_accepts_supported_contracts(
    job_type: str,
    task_name: str,
) -> None:
    message = MediaPreviewJobMessage.model_validate(
        _payload(
            jobType=job_type,
            taskName=task_name,
        )
    )

    assert message.job_type == JobType(job_type)


def test_media_preview_message_rejects_mismatched_task_name() -> None:
    with pytest.raises(ValidationError, match="does not match jobType"):
        MediaPreviewJobMessage.model_validate(
            _payload(taskName="generate_waveform_peak")
        )


def test_media_preview_message_forbids_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        MediaPreviewJobMessage.model_validate(_payload(unknown=True))


def test_media_preview_message_rejects_old_rich_payload() -> None:
    with pytest.raises(ValidationError):
        MediaPreviewJobMessage.model_validate(_payload(mediaId="media-1"))


def test_media_preview_job_output_has_stable_shape() -> None:
    output = MediaPreviewJobOutput(
        asset_count=1,
        asset_ids=[ASSET_ID],
    ).model_dump(mode="json", by_alias=True)

    assert output == {
        "type": "media_preview.job.output",
        "version": 1,
        "assetCount": 1,
        "assetIds": [str(ASSET_ID)],
    }
