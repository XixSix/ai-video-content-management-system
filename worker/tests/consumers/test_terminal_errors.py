from uuid import UUID

import pytest

from app.consumers import (
    chaptering_consumer,
    media_preview_consumer,
    transcript_consumer,
)
from app.pipelines.media_preview.pipeline import TerminalMediaPreviewPipelineError
from app.pipelines.transcript.pipeline import TerminalTranscriptPipelineError

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")


def test_transcript_consumer_records_pipeline_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str]] = []

    def process_job(message: object) -> dict[str, object]:
        raise TerminalTranscriptPipelineError(
            "Source media missing", error_code="SOURCE_OBJECT_NOT_FOUND"
        )

    def record_failure(job_id: str, error_message: str) -> None:
        failures.append((job_id, error_message))

    monkeypatch.setattr(transcript_consumer, "process_transcript_job", process_job)
    monkeypatch.setattr(
        transcript_consumer, "record_transcript_job_failure", record_failure
    )
    monkeypatch.setattr(
        transcript_consumer,
        "increment_transcript_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(TerminalTranscriptPipelineError):
        transcript_consumer.handle_transcript_job.run(
            jobId=str(JOB_ID),
            mediaId=str(MEDIA_ID),
            userId=str(USER_ID),
            s3Key="uploads/video.mp4",
            taskName="transcribe",
        )

    assert failures == [(str(JOB_ID), "SOURCE_OBJECT_NOT_FOUND: Source media missing")]


def test_chaptering_consumer_records_job_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str]] = []

    def process_job(message: object) -> dict[str, object]:
        raise chaptering_consumer.TerminalChapteringJobError(
            "Transcript is empty", error_code="TRANSCRIPT_EMPTY"
        )

    def record_failure(job_id: str, error_message: str) -> None:
        failures.append((job_id, error_message))

    monkeypatch.setattr(chaptering_consumer, "process_chaptering_job", process_job)
    monkeypatch.setattr(
        chaptering_consumer, "record_chaptering_job_failure", record_failure
    )
    monkeypatch.setattr(
        chaptering_consumer,
        "increment_chaptering_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(chaptering_consumer.TerminalChapteringJobError):
        chaptering_consumer.handle_chaptering_job.run(
            jobId=str(JOB_ID),
            mediaId=str(MEDIA_ID),
            userId=str(USER_ID),
            transcriptId=str(TRANSCRIPT_ID),
            transcriptVersion=2,
            taskName="generate_chapters",
        )

    assert failures == [(str(JOB_ID), "TRANSCRIPT_EMPTY: Transcript is empty")]


def test_media_preview_consumer_records_pipeline_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str]] = []

    def process_job(message: object) -> dict[str, object]:
        raise TerminalMediaPreviewPipelineError(
            "Source media missing",
            error_code="SOURCE_OBJECT_NOT_FOUND",
        )

    monkeypatch.setattr(
        media_preview_consumer,
        "process_media_preview_job",
        process_job,
    )
    monkeypatch.setattr(
        media_preview_consumer,
        "record_media_preview_job_failure",
        lambda job_id, error_message: failures.append((job_id, error_message)),
    )
    monkeypatch.setattr(
        media_preview_consumer,
        "increment_media_preview_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(TerminalMediaPreviewPipelineError):
        media_preview_consumer.handle_media_preview_job.run(
            jobId=str(JOB_ID),
            jobType="GENERATE_THUMBNAIL",
            mediaId=str(MEDIA_ID),
            workspaceId="00000000-0000-4000-8000-000000000005",
            userId=str(USER_ID),
            s3Bucket="vidpilot-media",
            s3Key="uploads/video.mp4",
            mediaType="VIDEO",
            mimeType="video/mp4",
            taskName="generate_thumbnail",
        )

    assert failures == [(str(JOB_ID), "SOURCE_OBJECT_NOT_FOUND: Source media missing")]
