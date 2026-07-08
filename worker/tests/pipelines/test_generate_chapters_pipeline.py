from collections.abc import Iterator
from contextlib import contextmanager
from uuid import UUID

import pytest

from app.db import chapters_repository
from app.pipelines.generate_chapters import pipeline
from app.schemas.chapters.input import GenerateChaptersOptions
from app.schemas.chapters.result import (
    ChapterBoundaryScore,
    ChapterCandidate,
    GeneratedChaptersResult,
    GenerateChaptersTranscript,
    GenerateChaptersTranscriptSegment,
)
from app.schemas.db.processsing_job import JobStatus, JobType, ProcessingJobRow
from app.services.ai_service import AIServiceTerminalError

JOB_ID = UUID("00000000-0000-4000-8000-000000000001")
MEDIA_ID = UUID("00000000-0000-4000-8000-000000000002")
USER_ID = UUID("00000000-0000-4000-8000-000000000003")
TRANSCRIPT_ID = UUID("00000000-0000-4000-8000-000000000004")
CHAPTER_ID = UUID("00000000-0000-4000-8000-000000000005")
SEGMENT_ID = UUID("00000000-0000-4000-8000-000000000006")


@contextmanager
def _session() -> Iterator[object]:
    yield object()


def _job() -> ProcessingJobRow:
    return ProcessingJobRow.model_validate(
        {
            "id": str(JOB_ID),
            "mediaId": str(MEDIA_ID),
            "userId": str(USER_ID),
            "jobType": JobType.GENERATE_CHAPTERS,
            "status": JobStatus.QUEUED,
            "progress": 0,
            "currentStep": None,
            "errorMessage": None,
            "queueName": "generate_chapters_queue",
            "taskName": "generate_chapters",
            "externalTaskId": None,
            "attemptCount": 0,
            "input": None,
            "output": None,
            "createdAt": "2026-05-27T00:00:00Z",
            "updatedAt": "2026-05-27T00:00:00Z",
            "startedAt": None,
            "completedAt": None,
        }
    )


def _options() -> GenerateChaptersOptions:
    return GenerateChaptersOptions(
        min_chapter_duration=120,
        target_chapter_duration=180,
        max_chapter_duration=360,
        max_chapters=3,
        llm={"enabled": False},
        embeddings={"enabled": False},
    )


def _transcript(**overrides: object) -> GenerateChaptersTranscript:
    values = {
        "id": TRANSCRIPT_ID,
        "media_id": MEDIA_ID,
        "language": "en",
        "version": 2,
        "media_duration": 180.0,
        "segments": [
            GenerateChaptersTranscriptSegment(
                id=SEGMENT_ID,
                start_time=0.0,
                end_time=90.0,
                text="Introduction",
                clean_text="Introduction",
            )
        ],
    }
    values.update(overrides)
    return GenerateChaptersTranscript(**values)


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


def _result() -> GeneratedChaptersResult:
    return GeneratedChaptersResult(
        transcript_id=TRANSCRIPT_ID,
        transcript_version=2,
        source="SEGMENTS",
        model="ai-service-generate-chapters-v1",
        chapters=[_chapter()],
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


def test_run_generate_chapters_pipeline_calls_ai_and_persists_chapters(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, object] = {"ai_service_calls": 0, "save_calls": []}

    monkeypatch.setattr(pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        pipeline.chapters_repository,
        "load_transcript_for_chapters",
        lambda session, transcript_id, media_id: _transcript(),
    )

    def generate_chapters(
        *,
        request_id: str,
        transcript: GenerateChaptersTranscript,
        options: GenerateChaptersOptions,
    ) -> GeneratedChaptersResult:
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
    ) -> chapters_repository.PersistedChaptersSummary:
        calls["save_calls"].append(
            (
                job_id,
                media_id,
                transcript_id,
                transcript_version,
                source,
                model,
                len(chapters),
            )
        )
        return _persisted_chapters()

    monkeypatch.setattr(
        pipeline.ai_service_client,
        "generate_chapters",
        generate_chapters,
    )
    monkeypatch.setattr(pipeline.chapters_repository, "save_chapters", save_chapters)

    output = pipeline.run_generate_chapters_pipeline(
        _job(),
        transcript_id=str(TRANSCRIPT_ID),
        transcript_version=2,
        options=_options(),
    )

    assert calls["ai_service_calls"] == 1
    assert calls["save_calls"] == [
        (
            str(JOB_ID),
            str(MEDIA_ID),
            str(TRANSCRIPT_ID),
            2,
            "SEGMENTS",
            "ai-service-generate-chapters-v1",
            1,
        )
    ]
    assert output.type == "generate_chapters.job.output"
    assert output.transcript_id == TRANSCRIPT_ID
    assert output.transcript_version == 2
    assert output.chapter_count == 1


def test_run_generate_chapters_pipeline_rejects_missing_transcript(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        pipeline.chapters_repository,
        "load_transcript_for_chapters",
        lambda session, transcript_id, media_id: None,
    )

    with pytest.raises(pipeline.TerminalGenerateChaptersPipelineError) as error:
        pipeline.run_generate_chapters_pipeline(
            _job(),
            transcript_id=str(TRANSCRIPT_ID),
            transcript_version=2,
            options=_options(),
        )

    assert error.value.error_code == "TRANSCRIPT_NOT_FOUND"


def test_run_generate_chapters_pipeline_maps_ai_service_terminal_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(pipeline, "get_db_session", _session)
    monkeypatch.setattr(
        pipeline.chapters_repository,
        "load_transcript_for_chapters",
        lambda session, transcript_id, media_id: _transcript(),
    )
    monkeypatch.setattr(
        pipeline.ai_service_client,
        "generate_chapters",
        lambda **kwargs: (_ for _ in ()).throw(
            AIServiceTerminalError(
                "invalid chapter request",
                error_code="AI_SERVICE_INVALID_ARGUMENT",
            )
        ),
    )

    with pytest.raises(pipeline.TerminalGenerateChaptersPipelineError) as error:
        pipeline.run_generate_chapters_pipeline(
            _job(),
            transcript_id=str(TRANSCRIPT_ID),
            transcript_version=2,
            options=_options(),
        )

    assert error.value.error_code == "AI_SERVICE_INVALID_ARGUMENT"
