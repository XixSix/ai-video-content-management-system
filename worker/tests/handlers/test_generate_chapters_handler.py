from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db import chapters_repository
from app.handlers import generate_chapters_handler
from app.pipelines.generate_chapters.pipeline import (
    TerminalGenerateChaptersPipelineError,
)
from app.schemas.chapters.input import GenerateChaptersOptions
from app.schemas.chapters.output import GenerateChaptersJobOutput
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.generate_chapters_message import GenerateChaptersJobMessage

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")
CHAPTER_ID = UUID("00000000-0000-4000-8000-000000000005")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> GenerateChaptersJobMessage:
    return GenerateChaptersJobMessage.model_validate(
        {
            "version": 1,
            "jobId": str(JOB_ID),
            "jobType": JobType.GENERATE_CHAPTERS,
            "taskName": "generate_chapters",
        }
    )


def _job(status: JobStatus = JobStatus.PENDING) -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "jobType": JobType.GENERATE_CHAPTERS,
            "status": status,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": None,
            "taskName": "generate_chapters",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": {
                "transcriptId": str(TRANSCRIPT_ID),
                "transcriptVersion": 2,
                "options": {
                    "minChapterDuration": 120,
                    "targetChapterDuration": 180,
                    "maxChapterDuration": 360,
                    "maxChapters": 3,
                    "llm": {"enabled": False},
                    "embeddings": {"enabled": False},
                },
            },
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _persisted_chapters() -> chapters_repository.PersistedChaptersSummary:
    return chapters_repository.PersistedChaptersSummary(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        model="ai-service-generate-chapters-v1",
        chapters=[
            chapters_repository.PersistedChapterSummary(
                id=CHAPTER_ID,
                media_id=MEDIA_ID,
                transcript_id=TRANSCRIPT_ID,
                job_id=JOB_ID,
                chapter_index=1,
                start_time=0.0,
                end_time=180.0,
                title="Introduction",
                summary=None,
                transcript_version=2,
                source="SEGMENTS",
                score=1.0,
                boundary_score=1.0,
                pause_score=0.0,
                discourse_marker_score=0.0,
                semantic_shift_score=0.0,
                duration_score=1.0,
            )
        ],
    )


def _output() -> GenerateChaptersJobOutput:
    return GenerateChaptersJobOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        chapter_count=1,
    )


def test_process_generate_chapters_job_happy_path_returns_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {
        "completed_output": None,
        "steps": [],
        "pipeline_calls": 0,
    }

    monkeypatch.setattr(generate_chapters_handler, "get_db_session", _session)
    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, **kwargs: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        generate_chapters_handler.chapters_repository,
        "find_chapters_by_job_id",
        lambda session, job_id: None,
    )

    def mark_completed(
        session: object, job_id: str, *, output: dict[str, object]
    ) -> None:
        calls["completed_output"] = output

    def mark_step(
        session: object,
        job_id: str,
        *,
        status: JobStatus,
        progress: int,
        current_step: str,
    ) -> None:
        calls["steps"].append((status, progress, current_step))

    def run_pipeline(
        job: ProcessingJobRow,
        *,
        transcript_id: str,
        transcript_version: int,
        options: GenerateChaptersOptions,
    ) -> GenerateChaptersJobOutput:
        calls["pipeline_calls"] += 1
        assert job.id == JOB_ID
        assert transcript_id == str(TRANSCRIPT_ID)
        assert transcript_version == 2
        assert options.target_chapter_duration == 180
        return _output()

    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository, "mark_job_completed", mark_completed
    )
    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository, "mark_job_step", mark_step
    )
    monkeypatch.setattr(
        generate_chapters_handler,
        "run_generate_chapters_pipeline",
        run_pipeline,
    )

    result = generate_chapters_handler.process_generate_chapters_job(_message())

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
    assert calls["pipeline_calls"] == 1
    assert calls["steps"] == [
        (JobStatus.GENERATING_CHAPTERS, 50, "Generating chapters"),
    ]
    assert calls["completed_output"]["type"] == "generate_chapters.job.output"
    assert calls["completed_output"]["transcriptId"] == str(TRANSCRIPT_ID)
    assert calls["completed_output"]["transcriptVersion"] == 2
    assert calls["completed_output"]["chapterCount"] == 1


def test_process_generate_chapters_job_skips_non_pending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(generate_chapters_handler, "get_db_session", _session)
    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(JobStatus.GENERATING_CHAPTERS),
    )

    result = generate_chapters_handler.process_generate_chapters_job(_message())

    assert result["type"] == "generate_chapters.job.result"
    assert result["status"] == "GENERATING_CHAPTERS"
    assert result["skipped"] is True


def test_process_generate_chapters_job_propagates_pipeline_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(generate_chapters_handler, "get_db_session", _session)
    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, **kwargs: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        generate_chapters_handler.chapters_repository,
        "find_chapters_by_job_id",
        lambda session, job_id: None,
    )
    monkeypatch.setattr(
        generate_chapters_handler.jobs_repository,
        "mark_job_step",
        lambda *args, **kwargs: None,
    )
    monkeypatch.setattr(
        generate_chapters_handler,
        "run_generate_chapters_pipeline",
        lambda job, *, transcript_id, transcript_version, options: (
            _ for _ in ()
        ).throw(
            TerminalGenerateChaptersPipelineError(
                "Transcript was not found for chapter generation",
                error_code="TRANSCRIPT_NOT_FOUND",
            )
        ),
    )

    with pytest.raises(TerminalGenerateChaptersPipelineError) as error:
        generate_chapters_handler.process_generate_chapters_job(_message())

    assert "TRANSCRIPT_NOT_FOUND" in str(error.value)
