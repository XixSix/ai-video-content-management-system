from uuid import UUID

import pytest

from app.consumers import (
    generate_chapters_consumer,
    generate_short_clips_consumer,
    media_preview_consumer,
    publish_consumer,
    render_export_consumer,
    transcribe_consumer,
)
from app.pipelines.generate_chapters.pipeline import (
    TerminalGenerateChaptersPipelineError,
)
from app.pipelines.generate_short_clips.pipeline import (
    TerminalGenerateShortClipsPipelineError,
)
from app.pipelines.media_preview.pipeline import TerminalMediaPreviewPipelineError
from app.pipelines.render_export.pipeline import TerminalRenderExportPipelineError
from app.pipelines.transcribe.pipeline import TerminalTranscribePipelineError

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")


def test_transcribe_consumer_records_pipeline_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str, str | None]] = []

    def process_job(message: object) -> dict[str, object]:
        raise TerminalTranscribePipelineError(
            "Source media missing", error_code="SOURCE_OBJECT_NOT_FOUND"
        )

    def record_failure(
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        failures.append((job_id, error_message, error_code))

    monkeypatch.setattr(transcribe_consumer, "process_transcribe_job", process_job)
    monkeypatch.setattr(
        transcribe_consumer, "record_transcribe_job_failure", record_failure
    )
    monkeypatch.setattr(
        transcribe_consumer,
        "increment_transcribe_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(TerminalTranscribePipelineError):
        transcribe_consumer.handle_transcribe_job.run(
            version=1,
            jobId=str(JOB_ID),
            jobType="TRANSCRIBE",
            taskName="transcribe",
        )

    assert failures == [
        (
            str(JOB_ID),
            "SOURCE_OBJECT_NOT_FOUND: Source media missing",
            "SOURCE_OBJECT_NOT_FOUND",
        )
    ]


def test_generate_chapters_consumer_records_job_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str, str | None]] = []

    def process_job(message: object) -> dict[str, object]:
        raise TerminalGenerateChaptersPipelineError(
            "Transcript is empty", error_code="TRANSCRIPT_EMPTY"
        )

    def record_failure(
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        failures.append((job_id, error_message, error_code))

    monkeypatch.setattr(
        generate_chapters_consumer, "process_generate_chapters_job", process_job
    )
    monkeypatch.setattr(
        generate_chapters_consumer,
        "record_generate_chapters_job_failure",
        record_failure,
    )
    monkeypatch.setattr(
        generate_chapters_consumer,
        "increment_generate_chapters_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(TerminalGenerateChaptersPipelineError):
        generate_chapters_consumer.handle_generate_chapters_job.run(
            version=1,
            jobId=str(JOB_ID),
            jobType="GENERATE_CHAPTERS",
            taskName="generate_chapters",
        )

    assert failures == [
        (str(JOB_ID), "TRANSCRIPT_EMPTY: Transcript is empty", "TRANSCRIPT_EMPTY")
    ]


def test_generate_short_clips_consumer_records_pipeline_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str, str | None]] = []

    def process_job(message: object) -> dict[str, object]:
        raise TerminalGenerateShortClipsPipelineError(
            "Transcript is empty", error_code="TRANSCRIPT_EMPTY"
        )

    def record_failure(
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        failures.append((job_id, error_message, error_code))

    monkeypatch.setattr(
        generate_short_clips_consumer, "process_generate_short_clips_job", process_job
    )
    monkeypatch.setattr(
        generate_short_clips_consumer,
        "record_generate_short_clips_job_failure",
        record_failure,
    )
    monkeypatch.setattr(
        generate_short_clips_consumer,
        "increment_generate_short_clips_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(TerminalGenerateShortClipsPipelineError):
        generate_short_clips_consumer.handle_generate_short_clips_job.run(
            version=1,
            jobId=str(JOB_ID),
            jobType="GENERATE_SHORT_CLIPS",
            taskName="generate_short_clips",
        )

    assert failures == [
        (str(JOB_ID), "TRANSCRIPT_EMPTY: Transcript is empty", "TRANSCRIPT_EMPTY")
    ]


def test_media_preview_consumer_records_pipeline_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str, str | None]] = []

    def process_job(message: object) -> dict[str, object]:
        raise TerminalMediaPreviewPipelineError(
            "Source media missing",
            error_code="SOURCE_OBJECT_NOT_FOUND",
        )

    def record_failure(
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        failures.append((job_id, error_message, error_code))

    monkeypatch.setattr(
        media_preview_consumer,
        "process_media_preview_job",
        process_job,
    )
    monkeypatch.setattr(
        media_preview_consumer,
        "record_media_preview_job_failure",
        record_failure,
    )
    monkeypatch.setattr(
        media_preview_consumer,
        "increment_media_preview_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(TerminalMediaPreviewPipelineError):
        media_preview_consumer.handle_media_preview_job.run(
            version=1,
            jobId=str(JOB_ID),
            jobType="GENERATE_THUMBNAIL",
            taskName="generate_thumbnail",
        )

    assert failures == [
        (
            str(JOB_ID),
            "SOURCE_OBJECT_NOT_FOUND: Source media missing",
            "SOURCE_OBJECT_NOT_FOUND",
        )
    ]


def test_render_export_consumer_records_pipeline_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str, str | None]] = []

    def process_job(message: object) -> dict[str, object]:
        raise TerminalRenderExportPipelineError(
            "Render source missing",
            error_code="RENDER_SOURCE_NOT_FOUND",
        )

    def record_failure(
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        failures.append((job_id, error_message, error_code))

    monkeypatch.setattr(
        render_export_consumer,
        "process_render_export_job",
        process_job,
    )
    monkeypatch.setattr(
        render_export_consumer,
        "record_render_export_job_failure",
        record_failure,
    )
    monkeypatch.setattr(
        render_export_consumer,
        "increment_render_export_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(TerminalRenderExportPipelineError):
        render_export_consumer.handle_render_export_job.run(
            version=1,
            jobId=str(JOB_ID),
            jobType="EXPORT_RENDER",
            taskName="export_render",
        )

    assert failures == [
        (
            str(JOB_ID),
            "RENDER_SOURCE_NOT_FOUND: Render source missing",
            "RENDER_SOURCE_NOT_FOUND",
        )
    ]


def test_publish_consumer_records_job_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str, str | None]] = []

    def process_job(message: object) -> dict[str, object]:
        raise publish_consumer.TerminalPublishJobError(
            "Publish target was not found",
            error_code="PUBLISH_TARGET_NOT_FOUND",
        )

    def record_failure(
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        failures.append((job_id, error_message, error_code))

    monkeypatch.setattr(publish_consumer, "process_publish_job", process_job)
    monkeypatch.setattr(
        publish_consumer,
        "record_publish_job_failure",
        record_failure,
    )
    monkeypatch.setattr(
        publish_consumer,
        "increment_publish_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(publish_consumer.TerminalPublishJobError):
        publish_consumer.handle_publish_job.run(
            version=1,
            jobId=str(JOB_ID),
            jobType="PUBLISH",
            taskName="publish",
        )

    assert failures == [
        (
            str(JOB_ID),
            "PUBLISH_TARGET_NOT_FOUND: Publish target was not found",
            "PUBLISH_TARGET_NOT_FOUND",
        )
    ]


def test_publish_consumer_records_pipeline_terminal_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failures: list[tuple[str, str, str | None]] = []

    def process_job(message: object) -> dict[str, object]:
        raise publish_consumer.TerminalPublishPipelineError(
            "Provider rejected the upload",
            error_code="PUBLISH_PROVIDER_TERMINAL",
        )

    def record_failure(
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        failures.append((job_id, error_message, error_code))

    monkeypatch.setattr(publish_consumer, "process_publish_job", process_job)
    monkeypatch.setattr(
        publish_consumer,
        "record_publish_job_failure",
        record_failure,
    )
    monkeypatch.setattr(
        publish_consumer,
        "increment_publish_job_attempt",
        lambda job_id: pytest.fail("terminal failures should not be retried"),
    )

    with pytest.raises(publish_consumer.TerminalPublishPipelineError):
        publish_consumer.handle_publish_job.run(
            version=1,
            jobId=str(JOB_ID),
            jobType="PUBLISH",
            taskName="publish",
        )

    assert failures == [
        (
            str(JOB_ID),
            "PUBLISH_PROVIDER_TERMINAL: Provider rejected the upload",
            "PUBLISH_PROVIDER_TERMINAL",
        )
    ]
