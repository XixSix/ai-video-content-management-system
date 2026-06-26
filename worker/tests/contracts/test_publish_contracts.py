import pytest
from pydantic import ValidationError

from app.schemas.jobs.publish_message import PublishJobMessage


def _payload() -> dict[str, object]:
    return {
        "jobId": "00000000-0000-4000-8000-000000000001",
        "publishTaskId": "00000000-0000-4000-8000-000000000002",
        "mediaId": None,
        "projectId": "00000000-0000-4000-8000-000000000003",
        "shortClipId": None,
        "exportAssetId": "00000000-0000-4000-8000-000000000004",
        "userId": "00000000-0000-4000-8000-000000000005",
        "platform": "FACEBOOK",
        "platformAccountId": "00000000-0000-4000-8000-000000000006",
        "scheduledAt": None,
        "taskName": "publish",
    }


def test_publish_job_message_accepts_backend_payload() -> None:
    message = PublishJobMessage.model_validate(_payload())

    assert str(message.publish_task_id) == "00000000-0000-4000-8000-000000000002"
    assert str(message.project_id) == "00000000-0000-4000-8000-000000000003"
    assert message.media_id is None


def test_publish_job_message_rejects_unknown_fields() -> None:
    payload = _payload() | {"unexpected": True}

    with pytest.raises(ValidationError):
        PublishJobMessage.model_validate(payload)
