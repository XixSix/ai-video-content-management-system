from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.jobs.publish_message import PublishJobMessage
from app.schemas.publish.input import PublishJobInput
from app.schemas.publish.output import PublishJobOutput

PUBLISH_TASK_ID = UUID("00000000-0000-4000-8000-000000000002")
EXPORT_ASSET_ID = UUID("00000000-0000-4000-8000-000000000003")


def _payload() -> dict[str, object]:
    return {
        "version": 1,
        "jobId": "00000000-0000-4000-8000-000000000001",
        "jobType": "PUBLISH",
        "taskName": "publish",
    }


def test_publish_job_message_accepts_backend_payload() -> None:
    message = PublishJobMessage.model_validate(_payload())

    assert str(message.job_id) == "00000000-0000-4000-8000-000000000001"


def test_publish_job_message_rejects_unknown_fields() -> None:
    payload = _payload() | {"unexpected": True}

    with pytest.raises(ValidationError):
        PublishJobMessage.model_validate(payload)


def test_publish_job_message_rejects_old_rich_payload() -> None:
    with pytest.raises(ValidationError):
        PublishJobMessage.model_validate(
            _payload() | {"publishTaskId": "00000000-0000-4000-8000-000000000002"}
        )


def test_publish_job_input_has_stable_shape() -> None:
    job_input = PublishJobInput.model_validate(
        {
            "publishTaskId": str(PUBLISH_TASK_ID),
            "exportAssetId": str(EXPORT_ASSET_ID),
            "scheduledAt": "2026-07-10T12:00:00Z",
        }
    ).model_dump(mode="json", by_alias=True)

    assert job_input == {
        "publishTaskId": str(PUBLISH_TASK_ID),
        "exportAssetId": str(EXPORT_ASSET_ID),
    }


def test_publish_job_output_has_stable_shape() -> None:
    output = PublishJobOutput(
        publish_task_id=PUBLISH_TASK_ID,
    ).model_dump(mode="json", by_alias=True)

    assert output == {
        "type": "publish.job.output",
        "version": 1,
        "publishTaskId": str(PUBLISH_TASK_ID),
    }
