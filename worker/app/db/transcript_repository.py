from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.schemas.transcribe.result import TranscriptResult

FULL_TEXT_PREVIEW_MAX_LENGTH = 300


@dataclass(frozen=True)
class TranscribeMediaSource:
    id: UUID
    user_id: UUID
    workspace_id: UUID
    media_type: str
    status: str
    s3_bucket: str
    s3_key: str
    s3_region: str | None
    mime_type: str | None


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
        """Return a bounded preview of transcript text for job outputs."""
        if not self.full_text:
            return None

        if len(self.full_text) > FULL_TEXT_PREVIEW_MAX_LENGTH:
            return f"{self.full_text[:FULL_TEXT_PREVIEW_MAX_LENGTH]}..."

        return self.full_text


def find_transcript_by_job_id(
    session: Session, job_id: str
) -> PersistedTranscriptSummary | None:
    """Find an already persisted transcript summary for a processing job."""
    row = (
        session.execute(
            text(
                """
            SELECT
              t.id,
              t.media_id,
              t.job_id,
              t.language,
              t.source::text AS source,
              NULLIF(CONCAT_WS(':', t.asr_model::text, t.model_size::text), '') AS model,
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
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    return _summary_from_row(row)


def load_transcribe_media_source(
    session: Session,
    media_id: str,
) -> TranscribeMediaSource | None:
    """Load source media metadata for a transcribe job from the database."""
    row = (
        session.execute(
            text(
                """
                SELECT
                  id,
                  user_id,
                  workspace_id,
                  type::text AS media_type,
                  status::text AS status,
                  s3_bucket,
                  s3_key,
                  s3_region,
                  mime_type
                FROM media
                WHERE id = :media_id
                """
            ),
            {"media_id": media_id},
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    return TranscribeMediaSource(
        id=UUID(str(row["id"])),
        user_id=UUID(str(row["user_id"])),
        workspace_id=UUID(str(row["workspace_id"])),
        media_type=row["media_type"],
        status=row["status"],
        s3_bucket=row["s3_bucket"],
        s3_key=row["s3_key"],
        s3_region=row["s3_region"],
        mime_type=row["mime_type"],
    )


def save_transcript(
    session: Session,
    *,
    job_id: str,
    media_id: str,
    result: TranscriptResult,
) -> PersistedTranscriptSummary:
    """Persist a transcript and timestamped segments unless the job already has one."""
    existing = find_transcript_by_job_id(session, job_id)

    if existing:
        return existing

    now = datetime.now(UTC)
    transcript_id = str(uuid4())
    session.execute(
        text(
            """
            INSERT INTO transcripts (
              id,
              media_id,
              job_id,
              language,
              source,
              asr_model,
              model_size,
              full_text,
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
              CAST(:asr_model AS "AsrModel"),
              CAST(:model_size AS "ModelSize"),
              :full_text,
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
            "asr_model": _asr_model_from_model_name(result.model),
            "model_size": _model_size_from_model_name(result.model),
            "full_text": result.full_text,
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


def _summary_from_row(row: RowMapping) -> PersistedTranscriptSummary:
    """Map a SQLAlchemy result row into a transcript summary."""
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


def _asr_model_from_model_name(model: str | None) -> str | None:
    """Map a provider model name into the current database ASR enum."""
    normalized = (model or "").lower()

    if "whisper" in normalized:
        return "FASTER-WHISPER"

    return None


def _model_size_from_model_name(model: str | None) -> str | None:
    """Map a provider model name into the current database model size enum."""
    normalized = (model or "").lower()

    if "large-v3-turbo" in normalized:
        return "large-v3-turbo"

    if "large-v3" in normalized:
        return "large-v3"

    if "medium.en" in normalized:
        return "medium.en"

    if "medium" in normalized:
        return "medium"

    if "small.en" in normalized:
        return "small.en"

    if "small" in normalized:
        return "small"

    if "base.en" in normalized:
        return "base.en"

    if "base" in normalized:
        return "base"

    if "tiny.en" in normalized:
        return "tiny.en"

    if "tiny" in normalized:
        return "tiny"

    return None
