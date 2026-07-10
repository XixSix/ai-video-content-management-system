from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db import short_clip_repository
from app.handlers import generate_short_clips_handler
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.generate_short_clips_message import (
    GenerateShortClipsJobMessage,
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


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> GenerateShortClipsJobMessage:
    return GenerateShortClipsJobMessage.model_validate(
        {
            "version": 1,
            "jobId": str(JOB_ID),
            "jobType": JobType.GENERATE_SHORT_CLIPS,
            "taskName": "generate_short_clips",
        }
    )


def _options(**overrides: object) -> GenerateShortClipsOptions:
    options = {
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
    options.update(overrides)
    return GenerateShortClipsOptions.model_validate(options)


def _job_input(**overrides: object) -> GenerateShortClipsJobInput:
    job_input = {
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "options": _options().model_dump(mode="json", by_alias=True),
    }
    job_input.update(overrides)
    return GenerateShortClipsJobInput.model_validate(job_input)


def _job(
    status: JobStatus = JobStatus.PENDING,
    *,
    input_overrides: dict[str, object] | None = None,
) -> ProcessingJobRow:
    job_input = _job_input().model_dump(mode="json", by_alias=True)
    job_input.update(input_overrides or {})

    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "jobType": JobType.GENERATE_SHORT_CLIPS,
            "status": status,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": None,
            "taskName": "generate_short_clips",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": job_input,
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _output() -> GenerateShortClipsJobOutput:
    return GenerateShortClipsJobOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        candidate_count=1,
        short_clip_count=1,
        asset_count=1,
        candidate_ids=[CANDIDATE_ID],
        short_clip_ids=[SHORT_CLIP_ID],
        asset_ids=[ASSET_ID],
    )


def test_process_generate_short_clips_job_happy_path_returns_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {
        "completed_output": None,
        "pipeline_clip_count": None,
        "steps": [],
    }

    monkeypatch.setattr(generate_short_clips_handler, "get_db_session", _session)
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: _job(
            JobStatus.QUEUED,
            input_overrides={
                "options": _options(clipCount=1).model_dump(mode="json", by_alias=True)
            },
        ),
    )
    monkeypatch.setattr(
        generate_short_clips_handler.short_clip_repository,
        "find_output_by_job_id",
        lambda session, job_id: None,
    )

    def mark_step(
        session: object,
        job_id: str,
        *,
        status: JobStatus,
        progress: int,
        current_step: str,
    ) -> None:
        calls["steps"].append((status, progress, current_step))

    def mark_completed(
        session: object, job_id: str, *, output: dict[str, object]
    ) -> None:
        calls["completed_output"] = output

    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "mark_job_step",
        mark_step,
    )
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "mark_job_completed",
        mark_completed,
    )
    monkeypatch.setattr(
        generate_short_clips_handler,
        "run_generate_short_clips_pipeline",
        lambda job, *, transcript_id, transcript_version, options: (
            calls.update(
                {
                    "pipeline_clip_count": options.clip_count,
                    "pipeline_transcript_id": transcript_id,
                    "pipeline_transcript_version": transcript_version,
                }
            )
            or _output()
        ),
    )

    result = generate_short_clips_handler.process_generate_short_clips_job(_message())

    assert result["type"] == "generate_short_clips.job.result"
    assert result["status"] == "COMPLETED"
    assert result["skipped"] is False
    assert calls["steps"] == [
        (JobStatus.GENERATING_SHORT_CLIPS, 50, "Generating short clips")
    ]
    assert calls["pipeline_clip_count"] == 1
    assert calls["pipeline_transcript_id"] == str(TRANSCRIPT_ID)
    assert calls["pipeline_transcript_version"] == 2
    assert calls["completed_output"]["candidateCount"] == 1
    assert calls["completed_output"]["candidateIds"] == [str(CANDIDATE_ID)]


def test_process_generate_short_clips_job_skips_non_pending_job(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(generate_short_clips_handler, "get_db_session", _session)
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(JobStatus.QUEUED),
    )

    result = generate_short_clips_handler.process_generate_short_clips_job(_message())

    assert result["status"] == "QUEUED"
    assert result["skipped"] is True


def test_record_generate_short_clips_job_failure_marks_job_and_short_clips_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, str, str | None] | tuple[str, str]] = []

    def mark_job_failed(
        session: object,
        job_id: str,
        error_message: str,
        *,
        error_code: str | None = None,
    ) -> None:
        calls.append(("job_failed", job_id, error_code))
        assert error_message == "Render failed"

    def mark_short_clips_failed_by_job_id(session: object, job_id: str) -> None:
        calls.append(("short_clips_failed", job_id))

    monkeypatch.setattr(generate_short_clips_handler, "get_db_session", _session)
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "mark_job_failed",
        mark_job_failed,
    )
    monkeypatch.setattr(
        generate_short_clips_handler.short_clip_repository,
        "mark_short_clips_failed_by_job_id",
        mark_short_clips_failed_by_job_id,
    )

    generate_short_clips_handler.record_generate_short_clips_job_failure(
        str(JOB_ID),
        "Render failed",
        error_code="SHORT_CLIP_RENDER_FAILED",
    )

    assert calls == [
        ("job_failed", str(JOB_ID), "SHORT_CLIP_RENDER_FAILED"),
        ("short_clips_failed", str(JOB_ID)),
    ]


def test_existing_output_completes_idempotently(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    candidate = short_clip_repository.PersistedClipCandidate(
        id=CANDIDATE_ID,
        media_id=MEDIA_ID,
        user_id=USER_ID,
        transcript_id=TRANSCRIPT_ID,
        chapter_id=None,
        job_id=JOB_ID,
        project_id=None,
        start_time=0,
        end_time=30,
        duration=30,
        transcript_version=2,
        title="Useful moment",
        reason="Already generated",
        score=8.5,
        text="Useful moment text",
    )
    short_clip = short_clip_repository.PersistedShortClip(
        id=SHORT_CLIP_ID,
        media_id=MEDIA_ID,
        user_id=USER_ID,
        candidate_id=CANDIDATE_ID,
        project_id=None,
        aspect_ratio="9:16",
        status="READY",
    )
    asset = short_clip_repository.PersistedShortClipAsset(
        id=ASSET_ID,
        asset_type="SHORT_CLIP_VIDEO",
        s3_bucket="vidpilot-media",
        s3_key="generated/short-clips/clip.mp4",
    )
    completed: dict[str, object] = {}

    monkeypatch.setattr(generate_short_clips_handler, "get_db_session", _session)
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        generate_short_clips_handler.short_clip_repository,
        "find_output_by_job_id",
        lambda session, job_id: short_clip_repository.PersistedShortClipsSummary(
            candidates=[candidate],
            short_clips=[short_clip],
            assets=[asset],
        ),
    )
    monkeypatch.setattr(
        generate_short_clips_handler.jobs_repository,
        "mark_job_completed",
        lambda session, job_id, output: completed.update(output),
    )

    result = generate_short_clips_handler.process_generate_short_clips_job(_message())

    assert result["status"] == "COMPLETED"
    assert result["skipped"] is True
    assert completed["assetIds"] == [str(ASSET_ID)]
