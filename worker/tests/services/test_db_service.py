from uuid import UUID

from app.db import chaptering_repository, jobs_repository, transcript_repository
from app.schemas.chaptering.result import ChapterBoundaryScore, ChapterCandidate
from app.schemas.db.processsing_job import JobStatus
from app.services.placeholder_transcription_service import (
    PlaceholderTranscriptResult,
    PlaceholderTranscriptSegment,
)

JOB_ID = "00000000-0000-4000-8000-000000000001"
MEDIA_ID = "00000000-0000-4000-8000-000000000002"


class FakeResult:
    def __init__(self, row: dict[str, object] | list[dict[str, object]] | None = None) -> None:
        self.row = row

    def mappings(self) -> "FakeResult":
        return self

    def one_or_none(self) -> dict[str, object] | None:
        if isinstance(self.row, list):
            return self.row[0] if self.row else None

        return self.row

    def all(self) -> list[dict[str, object]]:
        if self.row is None:
            return []

        if isinstance(self.row, list):
            return self.row

        return [self.row]


class FakeSession:
    def __init__(self, rows: list[dict[str, object] | list[dict[str, object]] | None]) -> None:
        self.rows = rows
        self.params: list[dict[str, object]] = []

    def execute(self, statement: object, params: dict[str, object]) -> FakeResult:
        self.params.append(params)

        if self.rows:
            return FakeResult(self.rows.pop(0))

        return FakeResult()


def _result() -> PlaceholderTranscriptResult:
    return PlaceholderTranscriptResult(
        language="vi",
        source="IMPORTED",
        model="worker-placeholder-transcriber-v1",
        full_text="Xin chao the gioi",
        word_count=4,
        segments=[
            PlaceholderTranscriptSegment(
                start_time=0.0, end_time=1.0, text="Xin chao", confidence=1.0
            ),
            PlaceholderTranscriptSegment(
                start_time=1.0, end_time=2.0, text="the gioi", confidence=1.0
            ),
        ],
    )


def test_save_transcript_inserts_transcript_and_segments() -> None:
    session = FakeSession(rows=[None])

    summary = transcript_repository.save_transcript(
        session, job_id=JOB_ID, media_id=MEDIA_ID, result=_result()
    )

    assert summary.id
    assert summary.job_id == UUID(JOB_ID)
    assert summary.media_id == UUID(MEDIA_ID)
    assert summary.segment_count == 2
    assert summary.word_count == 4
    assert len(session.params) == 4
    assert session.params[1]["source"] == "IMPORTED"
    assert session.params[2]["segment_index"] == 0
    assert session.params[3]["segment_index"] == 1


def test_save_transcript_returns_existing_summary_without_duplicate_insert() -> None:
    existing_row = {
        "id": "00000000-0000-4000-8000-000000000003",
        "media_id": MEDIA_ID,
        "job_id": JOB_ID,
        "language": "vi",
        "source": "IMPORTED",
        "model": "worker-placeholder-transcriber-v1",
        "full_text": "existing",
        "word_count": 1,
        "segment_count": 1,
    }
    session = FakeSession(rows=[existing_row])

    summary = transcript_repository.save_transcript(
        session, job_id=JOB_ID, media_id=MEDIA_ID, result=_result()
    )

    assert summary.id == UUID(existing_row["id"])
    assert summary.full_text == "existing"
    assert len(session.params) == 1


def test_increment_attempt_count_releases_job_for_retry() -> None:
    session = FakeSession(rows=[])

    jobs_repository.increment_attempt_count(session, JOB_ID)

    assert session.params[0]["job_id"] == JOB_ID
    assert session.params[0]["status"] == JobStatus.PENDING.value
    assert session.params[0]["current_step"] == "Queued for retry"


def test_save_chapters_persists_boundary_scores() -> None:
    chapter_row = {
        "id": "00000000-0000-4000-8000-000000000005",
        "media_id": MEDIA_ID,
        "transcript_id": "00000000-0000-4000-8000-000000000004",
        "job_id": JOB_ID,
        "chapter_index": 1,
        "start_time": 0.0,
        "end_time": 120.0,
        "title": "Giới thiệu",
        "summary": "Tóm tắt chương.",
        "transcript_version": 2,
        "source": "RULE_BASED",
        "score": 0.91,
        "boundary_score": 0.91,
        "pause_score": 0.2,
        "discourse_marker_score": 1.0,
        "semantic_shift_score": 0.0,
        "duration_score": 0.8,
    }
    session = FakeSession(rows=[None, None, [chapter_row]])
    chapter = ChapterCandidate(
        chapter_index=1,
        start_time=0.0,
        end_time=120.0,
        title="Giới thiệu",
        summary="Tóm tắt chương.",
        text="Giới thiệu nội dung.",
        score=ChapterBoundaryScore(
            score=0.91,
            boundary_score=0.91,
            pause_score=0.2,
            discourse_marker_score=1.0,
            semantic_shift_score=0.0,
            duration_score=0.8,
        ),
    )

    summary = chaptering_repository.save_chapters(
        session,
        job_id=JOB_ID,
        media_id=MEDIA_ID,
        transcript_id="00000000-0000-4000-8000-000000000004",
        transcript_version=2,
        chapters=[chapter],
        source="RULE_BASED",
    )

    insert_params = session.params[1]
    assert insert_params["score"] == 0.91
    assert insert_params["boundary_score"] == 0.91
    assert insert_params["pause_score"] == 0.2
    assert insert_params["discourse_marker_score"] == 1.0
    assert insert_params["semantic_shift_score"] == 0.0
    assert insert_params["duration_score"] == 0.8
    assert summary.chapters[0].score == 0.91
