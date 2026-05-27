import json
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.services.placeholder_transcription_service import PlaceholderTranscriptResult

FULL_TEXT_PREVIEW_MAX_LENGTH = 300


@dataclass(frozen=True)
class PersistedTranscriptSummary:
    id: UUID
    media_id: UUID
    job_id: UUID | None
    language: str | None
    source: str
    model: str | None
    full_text: str | None
    segment_count: int
    word_count: int

    @property
    def full_text_preview(self) -> str | None:
        if not self.full_text:
            return None

        if len(self.full_text) > FULL_TEXT_PREVIEW_MAX_LENGTH:
            return f"{self.full_text[:FULL_TEXT_PREVIEW_MAX_LENGTH]}..."

        return self.full_text


def find_transcript_by_job_id(session: Session, job_id: str) -> PersistedTranscriptSummary | None:
    row = session.execute(
        text(
            """
            SELECT
              t.id,
              t.media_id,
              t.job_id,
              t.language,
              t.source::text AS source,
              t.model,
              t.full_text,
              COALESCE(t.word_count, 0) AS word_count,
              COUNT(ts.id)::int AS segment_count
            FROM transcripts t
            LEFT JOIN transcript_segments ts ON ts.transcript_id = t.id
            WHERE t.job_id = :job_id
            GROUP BY t.id
            """
        ),
        {"job_id": job_id},
    ).mappings().one_or_none()

    if row is None:
        return None

    return _summary_from_row(row)


def save_transcript(
    session: Session,
    *,
    job_id: str,
    media_id: str,
    result: PlaceholderTranscriptResult,
) -> PersistedTranscriptSummary:
    existing = find_transcript_by_job_id(session, job_id)

    if existing:
        return existing

    now = datetime.now(UTC)
    transcript_id = str(uuid4())
    content = {
        "placeholder": True,
        "segments": [
            {
                "startTime": segment.start_time,
                "endTime": segment.end_time,
                "text": segment.text,
                "confidence": segment.confidence,
                "speakerLabel": segment.speaker_label,
            }
            for segment in result.segments
        ],
    }

    session.execute(
        text(
            """
            INSERT INTO transcripts (
              id,
              media_id,
              job_id,
              language,
              source,
              model,
              full_text,
              content,
              word_count,
              full_text_updated_at,
              created_at,
              updated_at
            )
            VALUES (
              :id,
              :media_id,
              :job_id,
              :language,
              CAST(:source AS "TranscriptSource"),
              :model,
              :full_text,
              CAST(:content AS jsonb),
              :word_count,
              :now,
              :now,
              :now
            )
            """
        ),
        {
            "id": transcript_id,
            "media_id": media_id,
            "job_id": job_id,
            "language": result.language,
            "source": result.source,
            "model": result.model,
            "full_text": result.full_text,
            "content": json.dumps(content),
            "word_count": result.word_count,
            "now": now,
        },
    )

    for index, segment in enumerate(result.segments):
        session.execute(
            text(
                """
                INSERT INTO transcript_segments (
                  id,
                  transcript_id,
                  media_id,
                  segment_index,
                  start_time,
                  end_time,
                  text,
                  clean_text,
                  confidence,
                  speaker_label,
                  created_at
                )
                VALUES (
                  :id,
                  :transcript_id,
                  :media_id,
                  :segment_index,
                  :start_time,
                  :end_time,
                  :text,
                  :clean_text,
                  :confidence,
                  :speaker_label,
                  :created_at
                )
                """
            ),
            {
                "id": str(uuid4()),
                "transcript_id": transcript_id,
                "media_id": media_id,
                "segment_index": index,
                "start_time": segment.start_time,
                "end_time": segment.end_time,
                "text": segment.text,
                "clean_text": segment.text,
                "confidence": segment.confidence,
                "speaker_label": segment.speaker_label,
                "created_at": now,
            },
        )

    return PersistedTranscriptSummary(
        id=UUID(transcript_id),
        media_id=UUID(media_id),
        job_id=UUID(job_id),
        language=result.language,
        source=result.source,
        model=result.model,
        full_text=result.full_text,
        segment_count=len(result.segments),
        word_count=result.word_count,
    )


def _summary_from_row(row: object) -> PersistedTranscriptSummary:
    return PersistedTranscriptSummary(
        id=UUID(str(row["id"])),
        media_id=UUID(str(row["media_id"])),
        job_id=UUID(str(row["job_id"])) if row["job_id"] is not None else None,
        language=row["language"],
        source=row["source"],
        model=row["model"],
        full_text=row["full_text"],
        segment_count=row["segment_count"],
        word_count=row["word_count"],
    )
