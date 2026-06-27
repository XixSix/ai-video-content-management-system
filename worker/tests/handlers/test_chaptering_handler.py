from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db import chaptering_repository
from app.handlers import chaptering_handler
from app.schemas.chaptering.output import (
    ChapteringCompletedOutput,
    ChapteringJobOptions,
    ChapteringOutputSummary,
)
from app.schemas.chaptering.result import (
    ChapterBoundaryScore,
    ChapterCandidate,
    ChapteringResult,
    ChapteringTranscript,
    ChapteringTranscriptSegment,
)
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.schemas.jobs.chaptering_message import ChapteringJobMessage

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")
CHAPTER_ID = UUID("00000000-0000-4000-8000-000000000005")
SEGMENT_ID = UUID("00000000-0000-4000-8000-000000000006")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _message() -> ChapteringJobMessage:
    return ChapteringJobMessage.model_validate(
        {
            "jobId": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "transcriptId": str(TRANSCRIPT_ID),
            "transcriptVersion": 2,
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
            "taskName": None,
            "externalTaskId": None,
            "attemptCount": 0,
            "input": {
                "transcriptId": str(TRANSCRIPT_ID),
                "transcriptVersion": 2,
                "minChapterDuration": 120,
                "targetChapterDuration": 180,
                "maxChapters": 3,
                "useLlm": False,
                "useEmbeddings": False,
            },
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _transcript() -> ChapteringTranscript:
    return ChapteringTranscript(
        id=TRANSCRIPT_ID,
        media_id=MEDIA_ID,
        language="en",
        version=2,
        media_duration=180.0,
        segments=[
            ChapteringTranscriptSegment(
                id=SEGMENT_ID,
                start_time=0.0,
                end_time=90.0,
                text="Introduction",
                clean_text="Introduction",
            )
        ],
    )


def _chapter() -> ChapterCandidate:
    return ChapterCandidate(
        chapter_index=1,
        start_time=0.0,
        end_time=180.0,
        title="Introduction",
        summary=None,
        text="",
        score=ChapterBoundaryScore(
            score=1.0,
            boundary_score=1.0,
            pause_score=0.0,
            discourse_marker_score=0.0,
            semantic_shift_score=0.0,
            duration_score=1.0,
        ),
    )


def _result() -> ChapteringResult:
    return ChapteringResult(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        source="RULE_BASED",
        model="ai-service-chaptering-v1",
        chapters=[_chapter()],
    )


def _persisted_chaptering() -> chaptering_repository.PersistedChapteringSummary:
    return chaptering_repository.PersistedChapteringSummary(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        model="ai-service-chaptering-v1",
        chapters=[
            chaptering_repository.PersistedChapterSummary(
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
                source="RULE_BASED",
                score=1.0,
                boundary_score=1.0,
                pause_score=0.0,
                discourse_marker_score=0.0,
                semantic_shift_score=0.0,
                duration_score=1.0,
            )
        ],
    )


def _output(options: ChapteringJobOptions) -> ChapteringCompletedOutput:
    return ChapteringCompletedOutput(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        model="ai-service-chaptering-v1",
        chapter_count=1,
        chapters=[
            ChapteringOutputSummary(
                id=CHAPTER_ID,
                chapter_index=1,
                start_time=0.0,
                end_time=180.0,
                title="Introduction",
                summary=None,
                transcript_version=2,
                source="RULE_BASED",
                score=1.0,
                boundary_score=1.0,
                pause_score=0.0,
                discourse_marker_score=0.0,
                semantic_shift_score=0.0,
                duration_score=1.0,
            )
        ],
        options=options,
    )


def test_process_chaptering_job_happy_path_returns_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {
        "completed_output": None,
        "steps": [],
        "ai_service_calls": 0,
        "save_calls": [],
    }

    monkeypatch.setattr(chaptering_handler, "get_db_session", _session)
    monkeypatch.setattr(
        chaptering_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        chaptering_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, **kwargs: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        chaptering_handler.chaptering_repository,
        "find_chaptering_by_job_id",
        lambda session, job_id: None,
    )
    monkeypatch.setattr(
        chaptering_handler.chaptering_repository,
        "load_transcript_for_chaptering",
        lambda session, transcript_id, media_id: _transcript(),
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

    def generate_chapters(
        *,
        request_id: str,
        transcript: ChapteringTranscript,
        options: ChapteringJobOptions,
    ) -> ChapteringResult:
        calls["ai_service_calls"] += 1
        assert request_id == str(JOB_ID)
        assert transcript.id == TRANSCRIPT_ID
        assert options.target_chapter_duration == 180
        return _result()

    def save_chapters(
        session: object,
        *,
        job_id: str,
        media_id: str,
        transcript_id: str,
        transcript_version: int,
        chapters: list[ChapterCandidate],
        source: str,
        model: str,
    ) -> chaptering_repository.PersistedChapteringSummary:
        calls["save_calls"].append((source, model, len(chapters)))
        return _persisted_chaptering()

    monkeypatch.setattr(
        chaptering_handler.jobs_repository, "mark_job_completed", mark_completed
    )
    monkeypatch.setattr(chaptering_handler.jobs_repository, "mark_job_step", mark_step)
    monkeypatch.setattr(
        chaptering_handler.ai_service_client, "generate_chapters", generate_chapters
    )
    monkeypatch.setattr(
        chaptering_handler.chaptering_repository, "save_chapters", save_chapters
    )

    result = chaptering_handler.process_chaptering_job(_message())

    assert result == {
        "type": "chaptering.job.result",
        "version": 1,
        "jobId": str(JOB_ID),
        "mediaId": str(MEDIA_ID),
        "userId": str(USER_ID),
        "transcriptId": str(TRANSCRIPT_ID),
        "transcriptVersion": 2,
        "status": "COMPLETED",
        "skipped": False,
    }
    assert calls["ai_service_calls"] == 1
    assert calls["save_calls"] == [("RULE_BASED", "ai-service-chaptering-v1", 1)]
    assert calls["steps"] == [
        (JobStatus.GENERATING_CHAPTERS, 50, "Processing chaptering"),
    ]
    assert calls["completed_output"]["type"] == "chaptering.completed"
    assert calls["completed_output"]["model"] == "ai-service-chaptering-v1"
    assert calls["completed_output"]["chapterCount"] == 1


def test_process_chaptering_job_skips_non_pending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(chaptering_handler, "get_db_session", _session)
    monkeypatch.setattr(
        chaptering_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(JobStatus.GENERATING_CHAPTERS),
    )

    result = chaptering_handler.process_chaptering_job(_message())

    assert result["type"] == "chaptering.job.result"
    assert result["status"] == "GENERATING_CHAPTERS"
    assert result["skipped"] is True


def test_process_chaptering_job_rejects_missing_transcript(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(chaptering_handler, "get_db_session", _session)
    monkeypatch.setattr(
        chaptering_handler.jobs_repository,
        "find_processing_job",
        lambda session, job_id: _job(),
    )
    monkeypatch.setattr(
        chaptering_handler.jobs_repository,
        "mark_job_queued_from_pending",
        lambda session, job_id, **kwargs: _job(JobStatus.QUEUED),
    )
    monkeypatch.setattr(
        chaptering_handler.chaptering_repository,
        "find_chaptering_by_job_id",
        lambda session, job_id: None,
    )
    monkeypatch.setattr(
        chaptering_handler.chaptering_repository,
        "load_transcript_for_chaptering",
        lambda session, transcript_id, media_id: None,
    )
    monkeypatch.setattr(
        chaptering_handler.jobs_repository,
        "mark_job_step",
        lambda *args, **kwargs: None,
    )

    with pytest.raises(chaptering_handler.TerminalChapteringJobError) as error:
        chaptering_handler.process_chaptering_job(_message())

    assert "TRANSCRIPT_NOT_FOUND" in str(error.value)
