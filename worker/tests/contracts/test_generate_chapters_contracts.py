from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.chapters.output import GenerateChaptersJobOutput
from app.schemas.db.processsing_job import JobStatus
from app.schemas.jobs.generate_chapters_message import (
    GenerateChaptersJobMessage,
    GenerateChaptersJobResultMessage,
)

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


def test_generate_chapters_job_message_is_strict() -> None:
    payload = {
        "version": 1,
        "jobId": str(JOB_ID),
        "jobType": "GENERATE_CHAPTERS",
        "taskName": "generate_chapters",
    }

    assert GenerateChaptersJobMessage.model_validate(payload).job_id == JOB_ID

    with pytest.raises(ValidationError):
        GenerateChaptersJobMessage.model_validate({**payload, "extra": True})

    with pytest.raises(ValidationError):
        GenerateChaptersJobMessage.model_validate({**payload, "taskName": "wrong"})

    with pytest.raises(ValidationError):
        GenerateChaptersJobMessage.model_validate(
            {**payload, "transcriptId": str(TRANSCRIPT_ID)}
        )


def test_generate_chapters_result_message_has_stable_shape() -> None:
    result = GenerateChaptersJobResultMessage(
        job_id=JOB_ID,
        media_id=MEDIA_ID,
        user_id=USER_ID,
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        status=JobStatus.COMPLETED,
        skipped=False,
    ).model_dump(mode="json", by_alias=True)

    assert result == {
        "type": "generate_chapters.job.result",
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
    output = GenerateChaptersJobOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        chapter_count=1,
    ).model_dump(mode="json", by_alias=True)

    assert output == {
        "type": "generate_chapters.job.output",
        "version": 1,
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "chapterCount": 1,
    }
