from uuid import UUID

from app.db import transcript_repository
from app.services.placeholder_transcription_service import PlaceholderTranscriptResult, PlaceholderTranscriptSegment

JOB_ID = "00000000-0000-4000-8000-000000000001"
MEDIA_ID = "00000000-0000-4000-8000-000000000002"


class FakeResult:
    def __init__(self, row: dict[str, object] | None = None) -> None:
        self.row = row

    def mappings(self) -> "FakeResult":
        return self

    def one_or_none(self) -> dict[str, object] | None:
        return self.row


class FakeSession:
    def __init__(self, rows: list[dict[str, object] | None]) -> None:
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
            PlaceholderTranscriptSegment(start_time=0.0, end_time=1.0, text="Xin chao", confidence=1.0),
            PlaceholderTranscriptSegment(start_time=1.0, end_time=2.0, text="the gioi", confidence=1.0),
        ],
    )


def test_save_transcript_inserts_transcript_and_segments() -> None:
    session = FakeSession(rows=[None])

    summary = transcript_repository.save_transcript(session, job_id=JOB_ID, media_id=MEDIA_ID, result=_result())

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

    summary = transcript_repository.save_transcript(session, job_id=JOB_ID, media_id=MEDIA_ID, result=_result())

    assert summary.id == UUID(existing_row["id"])
    assert summary.full_text == "existing"
    assert len(session.params) == 1
