from dataclasses import dataclass
from datetime import UTC, datetime
from typing import cast
from uuid import UUID, uuid4

from sqlalchemy.engine import RowMapping
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.chaptering.result import (
    ChapterCandidate,
    ChapterSource,
    ChapteringTranscript,
    ChapteringTranscriptSegment,
)

CHAPTERING_MODEL_FALLBACK = "ai-service-chaptering-v1"


@dataclass(frozen=True)
class PersistedChapterSummary:
    id: UUID
    media_id: UUID
    transcript_id: UUID
    job_id: UUID | None
    chapter_index: int
    start_time: float
    end_time: float
    title: str
    summary: str | None
    transcript_version: int
    source: ChapterSource
    score: float | None
    boundary_score: float | None
    pause_score: float | None
    discourse_marker_score: float | None
    semantic_shift_score: float | None
    duration_score: float | None


@dataclass(frozen=True)
class PersistedChapteringSummary:
    transcript_id: UUID
    transcript_version: int
    model: str
    chapters: list[PersistedChapterSummary]


def load_transcript_for_chaptering(
    session: Session,
    *,
    transcript_id: str,
    media_id: str,
) -> ChapteringTranscript | None:
    """Load transcript metadata and ordered timestamped segments for chaptering."""
    transcript_row = (
        session.execute(
            text(
                """
                SELECT
                  t.id,
                  t.media_id,
                  t.language,
                  t.version,
                  m.duration AS media_duration
                FROM transcripts t
                JOIN media m ON m.id = t.media_id
                WHERE t.id = :transcript_id
                  AND t.media_id = :media_id
                """
            ),
            {"transcript_id": transcript_id, "media_id": media_id},
        )
        .mappings()
        .one_or_none()
    )

    if transcript_row is None:
        return None

    segment_rows = (
        session.execute(
            text(
                """
                SELECT
                  id,
                  start_time,
                  end_time,
                  text,
                  clean_text
                FROM transcript_segments
                WHERE transcript_id = :transcript_id
                ORDER BY segment_index ASC, start_time ASC
                """
            ),
            {"transcript_id": transcript_id},
        )
        .mappings()
        .all()
    )

    return ChapteringTranscript(
        id=UUID(str(transcript_row["id"])),
        media_id=UUID(str(transcript_row["media_id"])),
        language=transcript_row["language"],
        version=transcript_row["version"],
        media_duration=transcript_row["media_duration"],
        segments=[
            ChapteringTranscriptSegment(
                id=UUID(str(row["id"])),
                start_time=float(row["start_time"]),
                end_time=float(row["end_time"]),
                text=row["text"],
                clean_text=row["clean_text"],
            )
            for row in segment_rows
        ],
    )


def find_chaptering_by_job_id(
    session: Session, job_id: str
) -> PersistedChapteringSummary | None:
    """Find already persisted chapters for idempotent chaptering job handling."""
    rows = _find_chapter_rows(session, "job_id = :job_id", {"job_id": job_id})

    if not rows:
        return None

    chapters = [_chapter_from_row(row) for row in rows]
    return PersistedChapteringSummary(
        transcript_id=chapters[0].transcript_id,
        transcript_version=chapters[0].transcript_version,
        model=CHAPTERING_MODEL_FALLBACK,
        chapters=chapters,
    )


def save_chapters(
    session: Session,
    *,
    job_id: str,
    media_id: str,
    transcript_id: str,
    transcript_version: int,
    chapters: list[ChapterCandidate],
    source: ChapterSource,
    model: str,
) -> PersistedChapteringSummary:
    """Replace transcript chapters with the current generated chapter set."""
    now = datetime.now(UTC)

    session.execute(
        text("DELETE FROM video_chapters WHERE transcript_id = :transcript_id"),
        {"transcript_id": transcript_id},
    )

    for chapter in chapters:
        session.execute(
            text(
                """
                INSERT INTO video_chapters (
                  id,
                  media_id,
                  transcript_id,
                  job_id,
                  chapter_index,
                  start_time,
                  end_time,
                  title,
                  summary,
                  transcript_version,
                  source,
                  score,
                  boundary_score,
                  pause_score,
                  discourse_marker_score,
                  semantic_shift_score,
                  duration_score,
                  created_at,
                  updated_at
                )
                VALUES (
                  :id,
                  :media_id,
                  :transcript_id,
                  :job_id,
                  :chapter_index,
                  :start_time,
                  :end_time,
                  :title,
                  :summary,
                  :transcript_version,
                  CAST(:source AS "ChapterSource"),
                  :score,
                  :boundary_score,
                  :pause_score,
                  :discourse_marker_score,
                  :semantic_shift_score,
                  :duration_score,
                  :now,
                  :now
                )
                """
            ),
            {
                "id": str(uuid4()),
                "media_id": media_id,
                "transcript_id": transcript_id,
                "job_id": job_id,
                "chapter_index": chapter.chapter_index,
                "start_time": chapter.start_time,
                "end_time": chapter.end_time,
                "title": chapter.title,
                "summary": chapter.summary,
                "transcript_version": transcript_version,
                "source": source,
                "score": chapter.score.score,
                "boundary_score": chapter.score.boundary_score,
                "pause_score": chapter.score.pause_score,
                "discourse_marker_score": chapter.score.discourse_marker_score,
                "semantic_shift_score": chapter.score.semantic_shift_score,
                "duration_score": chapter.score.duration_score,
                "now": now,
            },
        )

    rows = _find_chapter_rows(session, "job_id = :job_id", {"job_id": job_id})
    persisted = [_chapter_from_row(row) for row in rows]

    return PersistedChapteringSummary(
        transcript_id=UUID(transcript_id),
        transcript_version=transcript_version,
        model=model,
        chapters=persisted,
    )


def _find_chapter_rows(
    session: Session,
    where_sql: str,
    params: dict[str, str],
) -> list[RowMapping]:
    return list(
        session.execute(
            text(
                f"""
                SELECT
                  id,
                  media_id,
                  transcript_id,
                  job_id,
                  chapter_index,
                  start_time,
                  end_time,
                  title,
                  summary,
                  transcript_version,
                  source::text AS source,
                  score,
                  boundary_score,
                  pause_score,
                  discourse_marker_score,
                  semantic_shift_score,
                  duration_score
                FROM video_chapters
                WHERE {where_sql}
                ORDER BY chapter_index ASC
                """
            ),
            params,
        )
        .mappings()
        .all()
    )


def _chapter_from_row(row: RowMapping) -> PersistedChapterSummary:
    return PersistedChapterSummary(
        id=UUID(str(row["id"])),
        media_id=UUID(str(row["media_id"])),
        transcript_id=UUID(str(row["transcript_id"])),
        job_id=UUID(str(row["job_id"])) if row["job_id"] is not None else None,
        chapter_index=row["chapter_index"],
        start_time=float(row["start_time"]),
        end_time=float(row["end_time"]),
        title=row["title"],
        summary=row["summary"],
        transcript_version=row["transcript_version"],
        source=_parse_chapter_source(row["source"]),
        score=row["score"],
        boundary_score=row["boundary_score"],
        pause_score=row["pause_score"],
        discourse_marker_score=row["discourse_marker_score"],
        semantic_shift_score=row["semantic_shift_score"],
        duration_score=row["duration_score"],
    )


def _parse_chapter_source(source: object) -> ChapterSource:
    if source in {"RULE_BASED", "LLM", "USER_EDITED"}:
        return cast(ChapterSource, source)

    raise ValueError(f"Unknown chapter source: {source}")
