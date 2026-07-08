import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class RenderExportMedia:
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
class RenderExportProjectMedia:
    id: UUID
    role: str
    media: RenderExportMedia


@dataclass(frozen=True)
class RenderExportSnapshot:
    id: UUID
    version: int
    document: dict[str, Any]


@dataclass(frozen=True)
class RenderExportProject:
    id: UUID
    user_id: UUID
    workspace_id: UUID
    aspect_ratio: str
    duration: float | None
    media: RenderExportMedia
    project_media: list[RenderExportProjectMedia]
    snapshot: RenderExportSnapshot


@dataclass(frozen=True)
class TranscriptCaptionSource:
    transcript_id: UUID
    transcript_version: int
    captions: list[dict[str, Any]]


@dataclass(frozen=True)
class PersistedRenderExportAsset:
    id: UUID
    asset_type: str
    s3_bucket: str
    s3_key: str
    metadata: dict[str, Any] | None


def find_project_render_source(
    session: Session,
    *,
    project_id: str,
    editor_snapshot_id: str,
    editor_snapshot_version: int,
) -> RenderExportProject | None:
    row = (
        session.execute(
            text(
                """
                SELECT
                  p.id AS project_id,
                  p.user_id AS project_user_id,
                  p.workspace_id AS project_workspace_id,
                  p.aspect_ratio,
                  p.duration AS project_duration,
                  m.id AS media_id,
                  m.user_id AS media_user_id,
                  m.workspace_id AS media_workspace_id,
                  m.type::text AS media_type,
                  m.s3_bucket,
                  m.s3_key,
                  m.s3_region,
                  m.duration AS media_duration,
                  m.width,
                  m.height,
                  m.mime_type,
                  es.id AS snapshot_id,
                  es.version AS snapshot_version,
                  es.snapshot_json
                FROM projects p
                JOIN media m ON m.id = p.source_media_id
                JOIN editor_snapshots es ON es.project_id = p.id
                WHERE p.id = :project_id
                  AND es.id = :editor_snapshot_id
                  AND es.version = :editor_snapshot_version
                  AND p.status <> 'DELETED'
                  AND m.status = 'UPLOADED'
                  AND m.type = 'VIDEO'
                """
            ),
            {
                "project_id": project_id,
                "editor_snapshot_id": editor_snapshot_id,
                "editor_snapshot_version": editor_snapshot_version,
            },
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    project_media_rows = (
        session.execute(
            text(
                """
                SELECT
                  pm.id AS project_media_id,
                  pm.role::text AS project_media_role,
                  m.id AS media_id,
                  m.user_id AS media_user_id,
                  m.workspace_id AS media_workspace_id,
                  m.type::text AS media_type,
                  m.s3_bucket,
                  m.s3_key,
                  m.s3_region,
                  m.duration AS media_duration,
                  m.width,
                  m.height,
                  m.mime_type
                FROM project_media pm
                JOIN media m ON m.id = pm.media_id
                WHERE pm.project_id = :project_id
                  AND pm.role IN ('OVERLAY', 'AUDIO_BED')
                  AND m.status = 'UPLOADED'
                  AND m.type IN ('VIDEO', 'IMAGE', 'AUDIO')
                ORDER BY pm.created_at ASC, pm.id ASC
                """
            ),
            {"project_id": project_id},
        )
        .mappings()
        .all()
    )

    return RenderExportProject(
        id=UUID(str(row["project_id"])),
        user_id=UUID(str(row["project_user_id"])),
        workspace_id=UUID(str(row["project_workspace_id"])),
        aspect_ratio=row["aspect_ratio"],
        duration=_to_float(row["project_duration"]),
        media=RenderExportMedia(
            id=UUID(str(row["media_id"])),
            user_id=UUID(str(row["media_user_id"])),
            workspace_id=UUID(str(row["media_workspace_id"])),
            media_type=row["media_type"],
            s3_bucket=row["s3_bucket"],
            s3_key=row["s3_key"],
            s3_region=row["s3_region"],
            duration=_to_float(row["media_duration"]),
            width=row["width"],
            height=row["height"],
            mime_type=row["mime_type"],
        ),
        project_media=[
            RenderExportProjectMedia(
                id=UUID(str(project_media_row["project_media_id"])),
                role=project_media_row["project_media_role"],
                media=RenderExportMedia(
                    id=UUID(str(project_media_row["media_id"])),
                    user_id=UUID(str(project_media_row["media_user_id"])),
                    workspace_id=UUID(str(project_media_row["media_workspace_id"])),
                    media_type=project_media_row["media_type"],
                    s3_bucket=project_media_row["s3_bucket"],
                    s3_key=project_media_row["s3_key"],
                    s3_region=project_media_row["s3_region"],
                    duration=_to_float(project_media_row["media_duration"]),
                    width=project_media_row["width"],
                    height=project_media_row["height"],
                    mime_type=project_media_row["mime_type"],
                ),
            )
            for project_media_row in project_media_rows
        ],
        snapshot=RenderExportSnapshot(
            id=UUID(str(row["snapshot_id"])),
            version=row["snapshot_version"],
            document=row["snapshot_json"],
        ),
    )


def find_latest_caption_source(
    session: Session,
    *,
    media_id: str,
) -> TranscriptCaptionSource | None:
    transcript_row = (
        session.execute(
            text(
                """
                SELECT id, version
                FROM transcripts
                WHERE media_id = :media_id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """
            ),
            {"media_id": media_id},
        )
        .mappings()
        .one_or_none()
    )

    if transcript_row is None:
        return None

    word_rows = (
        session.execute(
            text(
                """
                SELECT text, start_time, end_time, confidence
                FROM transcript_words
                WHERE transcript_id = :transcript_id
                ORDER BY word_index ASC
                """
            ),
            {"transcript_id": str(transcript_row["id"])},
        )
        .mappings()
        .all()
    )

    if word_rows:
        captions = [
            _caption(
                text=f" {row['text']}",
                start_time=row["start_time"],
                end_time=row["end_time"],
                confidence=row["confidence"],
            )
            for row in word_rows
        ]
    else:
        segment_rows = (
            session.execute(
                text(
                    """
                    SELECT text, start_time, end_time, confidence
                    FROM transcript_segments
                    WHERE transcript_id = :transcript_id
                    ORDER BY segment_index ASC
                    """
                ),
                {"transcript_id": str(transcript_row["id"])},
            )
            .mappings()
            .all()
        )
        captions = [
            _caption(
                text=row["text"],
                start_time=row["start_time"],
                end_time=row["end_time"],
                confidence=row["confidence"],
            )
            for row in segment_rows
        ]

    return TranscriptCaptionSource(
        transcript_id=UUID(str(transcript_row["id"])),
        transcript_version=transcript_row["version"],
        captions=captions,
    )


def find_export_asset_by_job_id(
    session: Session,
    job_id: str,
) -> PersistedRenderExportAsset | None:
    row = (
        session.execute(
            text(
                """
                SELECT
                  id,
                  asset_type::text AS asset_type,
                  s3_bucket,
                  s3_key,
                  metadata
                FROM generated_assets
                WHERE job_id = :job_id
                  AND asset_type = 'EXPORT_VIDEO'
                ORDER BY created_at DESC, id DESC
                LIMIT 1
                """
            ),
            {"job_id": job_id},
        )
        .mappings()
        .one_or_none()
    )

    return _asset_from_row(row) if row else None


def upsert_export_asset(
    session: Session,
    *,
    user_id: str,
    media_id: str,
    project_id: str,
    job_id: str,
    transcript_version: int | None,
    s3_bucket: str,
    s3_key: str,
    s3_region: str | None,
    mime_type: str,
    file_size_bytes: int,
    metadata: dict[str, Any],
) -> PersistedRenderExportAsset:
    row = (
        session.execute(
            text(
                """
                INSERT INTO generated_assets (
                  id,
                  user_id,
                  media_id,
                  project_id,
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
                  :job_id,
                  'EXPORT_VIDEO',
                  :transcript_version,
                  :s3_bucket,
                  :s3_key,
                  :s3_region,
                  :mime_type,
                  :file_size_bytes,
                  CAST(:metadata AS jsonb),
                  :created_at
                )
                ON CONFLICT (s3_bucket, s3_key)
                DO UPDATE SET
                  user_id = EXCLUDED.user_id,
                  media_id = EXCLUDED.media_id,
                  project_id = EXCLUDED.project_id,
                  job_id = EXCLUDED.job_id,
                  transcript_version = EXCLUDED.transcript_version,
                  s3_region = EXCLUDED.s3_region,
                  mime_type = EXCLUDED.mime_type,
                  file_size_bytes = EXCLUDED.file_size_bytes,
                  metadata = EXCLUDED.metadata
                RETURNING
                  id,
                  asset_type::text AS asset_type,
                  s3_bucket,
                  s3_key,
                  metadata
                """
            ),
            {
                "id": str(uuid4()),
                "user_id": user_id,
                "media_id": media_id,
                "project_id": project_id,
                "job_id": job_id,
                "transcript_version": transcript_version,
                "s3_bucket": s3_bucket,
                "s3_key": s3_key,
                "s3_region": s3_region,
                "mime_type": mime_type,
                "file_size_bytes": file_size_bytes,
                "metadata": json.dumps(metadata),
                "created_at": datetime.now(UTC),
            },
        )
        .mappings()
        .one()
    )

    return _asset_from_row(row)


def _caption(
    *,
    text: str,
    start_time: Any,
    end_time: Any,
    confidence: Any,
) -> dict[str, Any]:
    start_ms = round(_to_float(start_time) * 1000)
    end_ms = round(_to_float(end_time) * 1000)

    return {
        "text": text,
        "startMs": start_ms,
        "endMs": max(end_ms, start_ms + 1),
        "timestampMs": None,
        "confidence": _to_float(confidence) if confidence is not None else None,
    }


def _to_float(value: Any) -> float:
    return float(value) if value is not None else 0.0


def _asset_from_row(row: Any) -> PersistedRenderExportAsset:
    return PersistedRenderExportAsset(
        id=UUID(str(row["id"])),
        asset_type=row["asset_type"],
        s3_bucket=row["s3_bucket"],
        s3_key=row["s3_key"],
        metadata=row["metadata"],
    )
