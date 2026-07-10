import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.schemas.short_clip.input import GenerateShortClipsOptions

if TYPE_CHECKING:
    from app.schemas.short_clip.result import ShortClipCandidateResult


@dataclass(frozen=True)
class ShortClipMedia:
    id: UUID
    user_id: UUID
    workspace_id: UUID
    media_type: str
    s3_bucket: str
    s3_key: str
    s3_region: str | None
    duration: float | None
    width: int | None
    height: int | None
    mime_type: str | None


@dataclass(frozen=True)
class ShortClipTranscript:
    id: UUID
    media_id: UUID
    language: str | None
    version: int


@dataclass(frozen=True)
class ShortClipTranscriptSegment:
    id: UUID
    segment_index: int
    start_time: float
    end_time: float
    text: str
    clean_text: str | None


@dataclass(frozen=True)
class ShortClipChapter:
    id: UUID
    start_time: float
    end_time: float
    title: str


@dataclass(frozen=True)
class ShortClipSource:
    media: ShortClipMedia
    transcript: ShortClipTranscript
    project_id: UUID | None
    segments: list[ShortClipTranscriptSegment]
    chapters: list[ShortClipChapter]


@dataclass(frozen=True)
class PersistedClipCandidate:
    id: UUID
    media_id: UUID
    user_id: UUID
    transcript_id: UUID
    chapter_id: UUID | None
    job_id: UUID | None
    project_id: UUID | None
    start_time: float
    end_time: float
    duration: float
    transcript_version: int
    title: str | None
    reason: str | None
    score: float | None
    text: str | None


@dataclass(frozen=True)
class PersistedShortClip:
    id: UUID
    media_id: UUID
    user_id: UUID
    candidate_id: UUID
    project_id: UUID | None
    aspect_ratio: str | None
    status: str


@dataclass(frozen=True)
class PersistedShortClipAsset:
    id: UUID
    asset_type: str
    s3_bucket: str
    s3_key: str


@dataclass(frozen=True)
class PersistedShortClipsSummary:
    candidates: list[PersistedClipCandidate]
    short_clips: list[PersistedShortClip]
    assets: list[PersistedShortClipAsset]


def load_short_clip_source(
    session: Session,
    *,
    media_id: str,
    transcript_id: str,
    transcript_version: int,
) -> ShortClipSource | None:
    row = (
        session.execute(
            text(
                """
                SELECT
                  m.id AS media_id,
                  m.user_id,
                  m.workspace_id,
                  m.type::text AS media_type,
                  m.s3_bucket,
                  m.s3_key,
                  m.s3_region,
                  m.duration AS media_duration,
                  m.width,
                  m.height,
                  m.mime_type,
                  t.id AS transcript_id,
                  t.language,
                  t.version AS transcript_version,
                  t.project_id
                FROM media m
                JOIN transcripts t ON t.media_id = m.id
                WHERE m.id = :media_id
                  AND t.id = :transcript_id
                  AND t.version = :transcript_version
                  AND m.status = 'UPLOADED'
                  AND m.type = 'VIDEO'
                FOR SHARE OF t
                """
            ),
            {
                "media_id": media_id,
                "transcript_id": transcript_id,
                "transcript_version": transcript_version,
            },
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    segment_rows = (
        session.execute(
            text(
                """
                SELECT id, segment_index, start_time, end_time, text, clean_text
                FROM transcript_segments
                WHERE transcript_id = :transcript_id
                ORDER BY start_time ASC, end_time ASC, segment_index ASC
                """
            ),
            {"transcript_id": transcript_id},
        )
        .mappings()
        .all()
    )
    chapter_rows = (
        session.execute(
            text(
                """
                SELECT id, start_time, end_time, title
                FROM video_chapters
                WHERE transcript_id = :transcript_id
                  AND transcript_version = :transcript_version
                ORDER BY chapter_index ASC, start_time ASC
                """
            ),
            {
                "transcript_id": transcript_id,
                "transcript_version": transcript_version,
            },
        )
        .mappings()
        .all()
    )

    return ShortClipSource(
        media=ShortClipMedia(
            id=UUID(str(row["media_id"])),
            user_id=UUID(str(row["user_id"])),
            workspace_id=UUID(str(row["workspace_id"])),
            media_type=row["media_type"],
            s3_bucket=row["s3_bucket"],
            s3_key=row["s3_key"],
            s3_region=row["s3_region"],
            duration=_to_float(row["media_duration"]),
            width=row["width"],
            height=row["height"],
            mime_type=row["mime_type"],
        ),
        transcript=ShortClipTranscript(
            id=UUID(str(row["transcript_id"])),
            media_id=UUID(str(row["media_id"])),
            language=row["language"],
            version=row["transcript_version"],
        ),
        project_id=UUID(str(row["project_id"])) if row["project_id"] else None,
        segments=[_segment_from_row(segment_row) for segment_row in segment_rows],
        chapters=[_chapter_from_row(chapter_row) for chapter_row in chapter_rows],
    )


def find_output_by_job_id(
    session: Session, job_id: str
) -> PersistedShortClipsSummary | None:
    candidate_rows = (
        session.execute(
            text(
                """
                SELECT *
                FROM clip_candidates
                WHERE job_id = :job_id
                ORDER BY score DESC NULLS LAST, created_at ASC
                """
            ),
            {"job_id": job_id},
        )
        .mappings()
        .all()
    )
    candidates = [_candidate_from_row(row) for row in candidate_rows]

    short_clip_rows = (
        session.execute(
            text(
                """
                SELECT sc.*
                FROM short_clips sc
                JOIN clip_candidates cc ON cc.id = sc.candidate_id
                WHERE cc.job_id = :job_id
                ORDER BY sc.created_at ASC
                """
            ),
            {"job_id": job_id},
        )
        .mappings()
        .all()
    )
    short_clips = [_short_clip_from_row(row) for row in short_clip_rows]

    asset_rows = (
        session.execute(
            text(
                """
                SELECT id, asset_type::text AS asset_type, s3_bucket, s3_key
                FROM generated_assets
                WHERE job_id = :job_id
                  AND asset_type IN ('SHORT_CLIP_VIDEO', 'SHORT_CLIP_SUBTITLE')
                ORDER BY created_at ASC
                """
            ),
            {"job_id": job_id},
        )
        .mappings()
        .all()
    )
    assets = [_asset_from_row(row) for row in asset_rows]

    if not candidates or not short_clips or not assets:
        return None

    return PersistedShortClipsSummary(
        candidates=candidates,
        short_clips=short_clips,
        assets=assets,
    )


def save_clip_candidates(
    session: Session,
    *,
    job_id: str,
    media_id: str,
    user_id: str,
    transcript_id: str,
    transcript_version: int,
    project_id: UUID | None,
    candidates: list["ShortClipCandidateResult"],
    options: GenerateShortClipsOptions,
) -> list[PersistedClipCandidate]:
    now = datetime.now(UTC)

    for candidate in candidates:
        session.execute(
            text(
                """
                INSERT INTO clip_candidates (
                  id,
                  media_id,
                  user_id,
                  transcript_id,
                  chapter_id,
                  job_id,
                  project_id,
                  start_time,
                  end_time,
                  duration,
                  transcript_version,
                  title,
                  reason,
                  score,
                  text,
                  metadata,
                  status,
                  created_at
                )
                VALUES (
                  :id,
                  :media_id,
                  :user_id,
                  :transcript_id,
                  NULL,
                  :job_id,
                  :project_id,
                  :start_time,
                  :end_time,
                  :duration,
                  :transcript_version,
                  :title,
                  :reason,
                  :score,
                  :text,
                  CAST(:metadata AS jsonb),
                  'CANDIDATE',
                  :now
                )
                """
            ),
            {
                "id": str(uuid4()),
                "media_id": media_id,
                "user_id": user_id,
                "transcript_id": transcript_id,
                "job_id": job_id,
                "project_id": str(project_id) if project_id else None,
                "start_time": candidate.start_time,
                "end_time": candidate.end_time,
                "duration": candidate.duration,
                "transcript_version": transcript_version,
                "title": candidate.title,
                "reason": candidate.reason,
                "score": candidate.score,
                "text": candidate.text,
                "metadata": json.dumps(
                    {
                        "sourceSegmentIds": [
                            str(segment_id)
                            for segment_id in candidate.source_segment_ids
                        ],
                        "startSegmentId": str(candidate.start_segment_id),
                        "endSegmentId": str(candidate.end_segment_id),
                        "options": options.model_dump(mode="json", by_alias=True),
                        "provider": candidate.provider,
                        "model": candidate.model,
                    }
                ),
                "now": now,
            },
        )

    rows = (
        session.execute(
            text(
                """
                SELECT *
                FROM clip_candidates
                WHERE job_id = :job_id
                ORDER BY score DESC NULLS LAST, created_at ASC
                """
            ),
            {"job_id": job_id},
        )
        .mappings()
        .all()
    )
    return [_candidate_from_row(row) for row in rows]


def create_or_update_short_clip_for_candidate(
    session: Session,
    *,
    candidate: PersistedClipCandidate,
    aspect_ratio: str,
) -> PersistedShortClip:
    now = datetime.now(UTC)
    row = (
        session.execute(
            text(
                """
                INSERT INTO short_clips (
                  id,
                  media_id,
                  user_id,
                  candidate_id,
                  project_id,
                  aspect_ratio,
                  status,
                  created_at,
                  updated_at
                )
                VALUES (
                  :id,
                  :media_id,
                  :user_id,
                  :candidate_id,
                  :project_id,
                  :aspect_ratio,
                  'RENDERING',
                  :now,
                  :now
                )
                ON CONFLICT (candidate_id)
                DO UPDATE SET
                  status = 'RENDERING',
                  aspect_ratio = EXCLUDED.aspect_ratio,
                  updated_at = EXCLUDED.updated_at
                RETURNING *
                """
            ),
            {
                "id": str(uuid4()),
                "media_id": str(candidate.media_id),
                "user_id": str(candidate.user_id),
                "candidate_id": str(candidate.id),
                "project_id": str(candidate.project_id)
                if candidate.project_id
                else None,
                "aspect_ratio": aspect_ratio,
                "now": now,
            },
        )
        .mappings()
        .one()
    )
    session.execute(
        text("UPDATE clip_candidates SET status = 'SELECTED' WHERE id = :id"),
        {"id": str(candidate.id)},
    )
    return _short_clip_from_row(row)


def mark_short_clip_ready(session: Session, short_clip_id: str) -> None:
    session.execute(
        text(
            """
            UPDATE short_clips
            SET status = 'READY', updated_at = :now
            WHERE id = :short_clip_id
            """
        ),
        {"short_clip_id": short_clip_id, "now": datetime.now(UTC)},
    )


def mark_short_clip_failed(session: Session, short_clip_id: str) -> None:
    session.execute(
        text(
            """
            UPDATE short_clips
            SET status = 'FAILED', updated_at = :now
            WHERE id = :short_clip_id
            """
        ),
        {"short_clip_id": short_clip_id, "now": datetime.now(UTC)},
    )


def mark_short_clips_failed_by_job_id(session: Session, job_id: str) -> None:
    session.execute(
        text(
            """
            UPDATE short_clips sc
            SET status = 'FAILED', updated_at = :now
            FROM clip_candidates cc
            WHERE sc.candidate_id = cc.id
              AND cc.job_id = :job_id
            """
        ),
        {"job_id": job_id, "now": datetime.now(UTC)},
    )


def upsert_short_clip_asset(
    session: Session,
    *,
    user_id: str,
    media_id: str,
    project_id: str | None,
    transcript_id: str,
    chapter_id: str | None,
    short_clip_id: str,
    job_id: str,
    asset_type: str,
    transcript_version: int,
    s3_bucket: str,
    s3_key: str,
    s3_region: str | None,
    mime_type: str,
    file_size_bytes: int,
    metadata: dict[str, Any],
) -> PersistedShortClipAsset:
    row = (
        session.execute(
            text(
                """
                INSERT INTO generated_assets (
                  id,
                  user_id,
                  media_id,
                  project_id,
                  transcript_id,
                  chapter_id,
                  short_clip_id,
                  job_id,
                  asset_type,
                  transcript_version,
                  s3_bucket,
                  s3_key,
                  s3_region,
                  mime_type,
                  file_size_bytes,
                  metadata,
                  created_at
                )
                VALUES (
                  :id,
                  :user_id,
                  :media_id,
                  :project_id,
                  :transcript_id,
                  :chapter_id,
                  :short_clip_id,
                  :job_id,
                  CAST(:asset_type AS "AssetType"),
                  :transcript_version,
                  :s3_bucket,
                  :s3_key,
                  :s3_region,
                  :mime_type,
                  :file_size_bytes,
                  CAST(:metadata AS jsonb),
                  :now
                )
                ON CONFLICT (s3_bucket, s3_key)
                DO UPDATE SET
                  short_clip_id = EXCLUDED.short_clip_id,
                  job_id = EXCLUDED.job_id,
                  transcript_version = EXCLUDED.transcript_version,
                  mime_type = EXCLUDED.mime_type,
                  file_size_bytes = EXCLUDED.file_size_bytes,
                  metadata = EXCLUDED.metadata
                RETURNING id, asset_type::text AS asset_type, s3_bucket, s3_key
                """
            ),
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "media_id": media_id,
                "project_id": project_id,
                "transcript_id": transcript_id,
                "chapter_id": chapter_id,
                "short_clip_id": short_clip_id,
                "job_id": job_id,
                "asset_type": asset_type,
                "transcript_version": transcript_version,
                "s3_bucket": s3_bucket,
                "s3_key": s3_key,
                "s3_region": s3_region,
                "mime_type": mime_type,
                "file_size_bytes": file_size_bytes,
                "metadata": json.dumps(metadata),
                "now": datetime.now(UTC),
            },
        )
        .mappings()
        .one()
    )
    return _asset_from_row(row)


def _segment_from_row(row: RowMapping) -> ShortClipTranscriptSegment:
    return ShortClipTranscriptSegment(
        id=UUID(str(row["id"])),
        segment_index=row["segment_index"],
        start_time=float(row["start_time"]),
        end_time=float(row["end_time"]),
        text=row["text"],
        clean_text=row["clean_text"],
    )


def _chapter_from_row(row: RowMapping) -> ShortClipChapter:
    return ShortClipChapter(
        id=UUID(str(row["id"])),
        start_time=float(row["start_time"]),
        end_time=float(row["end_time"]),
        title=row["title"],
    )


def _candidate_from_row(row: RowMapping) -> PersistedClipCandidate:
    return PersistedClipCandidate(
        id=UUID(str(row["id"])),
        media_id=UUID(str(row["media_id"])),
        user_id=UUID(str(row["user_id"])),
        transcript_id=UUID(str(row["transcript_id"])),
        chapter_id=UUID(str(row["chapter_id"])) if row["chapter_id"] else None,
        job_id=UUID(str(row["job_id"])) if row["job_id"] else None,
        project_id=UUID(str(row["project_id"])) if row["project_id"] else None,
        start_time=float(row["start_time"]),
        end_time=float(row["end_time"]),
        duration=float(row["duration"]),
        transcript_version=row["transcript_version"],
        title=row["title"],
        reason=row["reason"],
        score=_to_float(row["score"]),
        text=row["text"],
    )


def _short_clip_from_row(row: RowMapping) -> PersistedShortClip:
    return PersistedShortClip(
        id=UUID(str(row["id"])),
        media_id=UUID(str(row["media_id"])),
        user_id=UUID(str(row["user_id"])),
        candidate_id=UUID(str(row["candidate_id"])),
        project_id=UUID(str(row["project_id"])) if row["project_id"] else None,
        aspect_ratio=row["aspect_ratio"],
        status=row["status"],
    )


def _asset_from_row(row: RowMapping) -> PersistedShortClipAsset:
    return PersistedShortClipAsset(
        id=UUID(str(row["id"])),
        asset_type=row["asset_type"],
        s3_bucket=row["s3_bucket"],
        s3_key=row["s3_key"],
    )


def _to_float(value: Any) -> float | None:
    if value is None:
        return None

    return float(value)
