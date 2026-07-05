from uuid import UUID

from app.db import (
    chaptering_repository,
    jobs_repository,
    short_clip_repository,
    transcript_repository,
)
from app.schemas.chaptering.result import ChapterBoundaryScore, ChapterCandidate
from app.schemas.db.processsing_job import JobStatus
from app.services.placeholder_transcription_service import (
    PlaceholderTranscriptResult,
    PlaceholderTranscriptSegment,
)

JOB_ID = "00000000-0000-4000-8000-000000000001"
MEDIA_ID = "00000000-0000-4000-8000-000000000002"


class FakeResult:
    def __init__(
        self, row: dict[str, object] | list[dict[str, object]] | None = None
    ) -> None:
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
    def __init__(
        self, rows: list[dict[str, object] | list[dict[str, object]] | None]
    ) -> None:
        self.rows = rows
        self.params: list[dict[str, object]] = []
        self.statements: list[object] = []

    def execute(self, statement: object, params: dict[str, object]) -> FakeResult:
        self.statements.append(statement)
        self.params.append(params)

        if self.rows:
            return FakeResult(self.rows.pop(0))

        return FakeResult()


def _result() -> PlaceholderTranscriptResult:
    return _result_with_model("worker-placeholder-transcriber-v1")


def _result_with_model(model: str) -> PlaceholderTranscriptResult:
    return PlaceholderTranscriptResult(
        language="en",
        source="IMPORTED",
        model=model,
        full_text="Hello world",
        word_count=2,
        segments=[
            PlaceholderTranscriptSegment(
                start_time=0.0, end_time=1.0, text="Hello", confidence=1.0
            ),
            PlaceholderTranscriptSegment(
                start_time=1.0, end_time=2.0, text="world", confidence=1.0
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
    assert summary.word_count == 2
    assert len(session.params) == 4
    assert session.params[1]["source"] == "IMPORTED"
    assert session.params[2]["segment_index"] == 0
    assert session.params[3]["segment_index"] == 1


def test_save_transcript_maps_whisper_model_to_database_enum_values() -> None:
    session = FakeSession(rows=[None])

    transcript_repository.save_transcript(
        session,
        job_id=JOB_ID,
        media_id=MEDIA_ID,
        result=_result_with_model("faster-whisper-small"),
    )

    insert_params = session.params[1]
    assert insert_params["asr_model"] == "FASTER-WHISPER"
    assert insert_params["model_size"] == "small"


def test_save_transcript_returns_existing_summary_without_duplicate_insert() -> None:
    existing_row = {
        "id": "00000000-0000-4000-8000-000000000003",
        "media_id": MEDIA_ID,
        "job_id": JOB_ID,
        "language": "en",
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


def test_chaptering_loads_transcript_segments_in_timeline_order() -> None:
    transcript_row = {
        "id": "00000000-0000-4000-8000-000000000004",
        "media_id": MEDIA_ID,
        "language": "en",
        "version": 1,
        "media_duration": 120.0,
    }
    session = FakeSession(rows=[transcript_row, []])

    chaptering_repository.load_transcript_for_chaptering(
        session,
        transcript_id="00000000-0000-4000-8000-000000000004",
        media_id=MEDIA_ID,
    )

    assert "ORDER BY start_time ASC, end_time ASC, segment_index ASC" in str(
        session.statements[1]
    )


def test_short_clip_source_loads_transcript_segments_in_timeline_order() -> None:
    source_row = {
        "media_id": MEDIA_ID,
        "user_id": "00000000-0000-4000-8000-000000000003",
        "workspace_id": "00000000-0000-4000-8000-000000000004",
        "media_type": "VIDEO",
        "s3_bucket": "vidpilot-media",
        "s3_key": "uploads/source.mp4",
        "s3_region": None,
        "media_duration": 120.0,
        "width": 1920,
        "height": 1080,
        "mime_type": "video/mp4",
        "transcript_id": "00000000-0000-4000-8000-000000000005",
        "language": "en",
        "transcript_version": 1,
        "project_id": None,
    }
    session = FakeSession(rows=[source_row, [], []])

    short_clip_repository.load_short_clip_source(
        session,
        media_id=MEDIA_ID,
        transcript_id="00000000-0000-4000-8000-000000000004",
    )

    assert "ORDER BY start_time ASC, end_time ASC, segment_index ASC" in str(
        session.statements[1]
    )


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
        "title": "Introduction",
        "transcript_version": 2,
        "source": "SEGMENTS",
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
        title="Introduction",
        summary="Chapter summary.",
        text="Introduction content.",
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
        model="ai-service-chaptering-v1",
    )

    insert_params = session.params[1]
    assert insert_params["score"] == 0.91
    assert insert_params["boundary_score"] == 0.91
    assert insert_params["pause_score"] == 0.2
    assert insert_params["discourse_marker_score"] == 1.0
    assert insert_params["semantic_shift_score"] == 0.0
    assert insert_params["duration_score"] == 0.8
    assert insert_params["source"] == "SEGMENTS"
    assert "summary" not in insert_params
    assert summary.model == "ai-service-chaptering-v1"
    assert summary.chapters[0].score == 0.91
