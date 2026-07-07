from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.db.processsing_job import JobStatus
from app.schemas.jobs.transcribe_message import (
    TranscribeJobMessage,
    TranscribeJobResultMessage,
)
from app.schemas.transcribe.output import TranscribeJobOutput

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


def test_transcribe_job_message_is_strict() -> None:
    payload = {
        "version": 1,
        "jobId": str(JOB_ID),
        "jobType": "TRANSCRIBE",
        "taskName": "transcribe",
    }

    assert TranscribeJobMessage.model_validate(payload).job_id == JOB_ID

    with pytest.raises(ValidationError):
        TranscribeJobMessage.model_validate({**payload, "extra": True})

    with pytest.raises(ValidationError):
        TranscribeJobMessage.model_validate({**payload, "taskName": "wrong"})

    with pytest.raises(ValidationError):
        TranscribeJobMessage.model_validate({**payload, "mediaId": str(MEDIA_ID)})


def test_result_message_has_stable_shape_for_completed_and_skipped() -> None:
    base = {
        "job_id": JOB_ID,
        "media_id": MEDIA_ID,
        "user_id": USER_ID,
        "status": JobStatus.COMPLETED,
    }

    completed = TranscribeJobResultMessage(skipped=False, **base).model_dump(
        mode="json", by_alias=True
    )
    skipped = TranscribeJobResultMessage(skipped=True, **base).model_dump(
        mode="json", by_alias=True
    )

    assert completed.keys() == skipped.keys()
    assert completed["type"] == "transcript.job.result"
    assert completed["version"] == 1
    assert completed == {
        "type": "transcript.job.result",
        "version": 1,
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "status": "COMPLETED",
        "skipped": False,
    }


def test_completed_output_shape_has_no_mock_field() -> None:
    output = TranscribeJobOutput(
        transcript_id=TRANSCRIPT_ID,
        segment_count=2,
        word_count=12,
    ).model_dump(mode="json", by_alias=True)

    assert output == {
        "type": "transcribe.job.output",
        "version": 1,
        "transcriptId": str(TRANSCRIPT_ID),
        "segmentCount": 2,
        "wordCount": 12,
    }
    assert "mock" not in output
