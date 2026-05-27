from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.db.processsing_job import JobStatus
from app.schemas.jobs.transcript_message import TranscriptJobMessage, TranscriptJobResultMessage
from app.schemas.transcript.output import (
    TranscriptArtifactsOutput,
    TranscriptAudioOutput,
    TranscriptCompletedOutput,
    TranscriptJobOptions,
    TranscriptOutputSummary,
)

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


def test_transcript_job_message_is_strict() -> None:
    payload = {
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "s3Key": "uploads/video.mp4",
        "taskName": "transcribe",
    }

    assert TranscriptJobMessage.model_validate(payload).job_id == JOB_ID

    with pytest.raises(ValidationError):
        TranscriptJobMessage.model_validate({**payload, "extra": True})

    with pytest.raises(ValidationError):
        TranscriptJobMessage.model_validate({**payload, "taskName": "wrong"})


def test_result_message_has_stable_shape_for_completed_and_skipped() -> None:
    base = {
        "job_id": JOB_ID,
        "media_id": MEDIA_ID,
        "user_id": USER_ID,
        "status": JobStatus.COMPLETED,
    }

    completed = TranscriptJobResultMessage(skipped=False, **base).model_dump(mode="json", by_alias=True)
    skipped = TranscriptJobResultMessage(skipped=True, **base).model_dump(mode="json", by_alias=True)

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
    output = TranscriptCompletedOutput(
        transcript=TranscriptOutputSummary(
            id=TRANSCRIPT_ID,
            language="vi",
            segment_count=2,
            word_count=12,
            full_text_preview="Xin chao",
        ),
        audio=TranscriptAudioOutput(
            duration_seconds=12.34,
            sample_rate=16000,
            channels=1,
            codec_name="pcm_s16le",
            silence_ratio=0.12,
        ),
        artifacts=TranscriptArtifactsOutput(),
        options=TranscriptJobOptions(language="vi"),
    ).model_dump(mode="json", by_alias=True)

    assert output == {
        "type": "transcript.completed",
        "version": 1,
        "transcript": {
            "id": str(TRANSCRIPT_ID),
            "language": "vi",
            "source": "IMPORTED",
            "model": "worker-placeholder-transcriber-v1",
            "segmentCount": 2,
            "wordCount": 12,
            "fullTextPreview": "Xin chao",
        },
        "audio": {
            "durationSeconds": 12.34,
            "sampleRate": 16000,
            "channels": 1,
            "codecName": "pcm_s16le",
            "silenceRatio": 0.12,
        },
        "artifacts": {
            "srtKey": None,
            "vttKey": None,
        },
        "options": {
            "language": "vi",
            "generateSrt": True,
            "generateVtt": True,
            "burnTranscript": False,
            "useVad": True,
            "sourceSeparation": False,
            "useDiarization": False,
        },
    }
    assert "mock" not in output
