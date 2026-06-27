from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db import short_clip_repository
from app.handlers import short_clip_handler
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.short_clip_message import ShortClipJobMessage
from app.schemas.short_clip.output import (
    ShortClipAssetSummary,
    ShortClipCandidateSummary,
    ShortClipCompletedOutput,
    ShortClipSummary,
)

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


def _message() -> ShortClipJobMessage:
    return ShortClipJobMessage.model_validate(
        {
            "jobId": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "transcriptId": str(TRANSCRIPT_ID),
            "transcriptVersion": 2,
            "preferences": {
                "transcriptId": str(TRANSCRIPT_ID),
                "transcriptVersion": 2,
                "clipCount": 3,
                "clipLength": "AUTO",
                "minDuration": 20,
                "maxDuration": 60,
                "aspectRatio": "9:16",
                "language": "AUTO",
                "genre": "AUTO",
                "clipModel": "AUTO",
                "autoHook": True,
                "prompt": "",
                "captionPresetId": "karaoke",
                "burnSubtitle": True,
            },
            "taskName": "generate_short_clips",
        }
    )


def _job(status: JobStatus = JobStatus.PENDING) -> ProcessingJobRow:
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
            "taskName": None,
            "externalTaskId": None,
            "attemptCount": 0,
            "input": _message().preferences.model_dump(mode="json", by_alias=True),
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _output() -> ShortClipCompletedOutput:
    return ShortClipCompletedOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        candidate_ids=[CANDIDATE_ID],
        short_clip_ids=[SHORT_CLIP_ID],
        asset_ids=[ASSET_ID],
        candidates=[
            ShortClipCandidateSummary(
                id=CANDIDATE_ID,
                start_time=0,
                end_time=30,
                duration=30,
                title="Useful moment",
                score=8.5,
            )
        ],
        short_clips=[
            ShortClipSummary(
                id=SHORT_CLIP_ID,
                candidate_id=CANDIDATE_ID,
                status="READY",
            )
        ],
        assets=[
            ShortClipAssetSummary(
                id=ASSET_ID,
                asset_type="SHORT_CLIP_VIDEO",
                s3_bucket="vidpilot-media",
                s3_key="generated/short-clips/clip.mp4",
            )
        ],
    )


def test_process_short_clip_job_happy_path_returns_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {"completed_output": None, "steps": []}

    monkeypatch.setattr(short_clip_handler, "get_db_session", _session)
    monkeypatch.setattr(
        short_clip_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        short_clip_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        short_clip_handler.short_clip_repository,
        "find_output_by_job_id",
        lambda session, job_id: ([], [], []),
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
        short_clip_handler.jobs_repository,
        "mark_job_step",
        mark_step,
    )
    monkeypatch.setattr(
        short_clip_handler.jobs_repository,
        "mark_job_completed",
        mark_completed,
    )
    monkeypatch.setattr(
        short_clip_handler, "run_short_clip_pipeline", lambda message: _output()
    )

    result = short_clip_handler.process_short_clip_job(_message())

    assert result["type"] == "short_clip.job.result"
    assert result["status"] == "COMPLETED"
    assert result["skipped"] is False
    assert calls["steps"] == [
        (JobStatus.GENERATING_SHORT_CLIPS, 50, "Generating short clips")
    ]
    assert calls["completed_output"]["candidateIds"] == [str(CANDIDATE_ID)]


def test_process_short_clip_job_skips_non_pending_job(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(short_clip_handler, "get_db_session", _session)
    monkeypatch.setattr(
        short_clip_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(JobStatus.QUEUED),
    )

    result = short_clip_handler.process_short_clip_job(_message())

    assert result["status"] == "QUEUED"
    assert result["skipped"] is True


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

    monkeypatch.setattr(short_clip_handler, "get_db_session", _session)
    monkeypatch.setattr(
        short_clip_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        short_clip_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, current_step: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        short_clip_handler.short_clip_repository,
        "find_output_by_job_id",
        lambda session, job_id: ([candidate], [short_clip], [asset]),
    )
    monkeypatch.setattr(
        short_clip_handler.jobs_repository,
        "mark_job_completed",
        lambda session, job_id, output: completed.update(output),
    )

    result = short_clip_handler.process_short_clip_job(_message())

    assert result["status"] == "COMPLETED"
    assert result["skipped"] is True
    assert completed["assetIds"] == [str(ASSET_ID)]
