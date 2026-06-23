import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class PersistedMediaPreviewAsset:
    id: UUID
    asset_type: str
    s3_bucket: str
    s3_key: str
    metadata: dict[str, Any] | None


def find_assets_by_job_id(
    session: Session,
    job_id: str,
) -> list[PersistedMediaPreviewAsset]:
    rows = (
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
                  AND asset_type IN (
                    'THUMBNAIL',
                    'THUMBNAIL_SPRITE',
                    'WAVEFORM_PEAKS'
                  )
                ORDER BY created_at ASC, id ASC
                """
            ),
            {"job_id": job_id},
        )
        .mappings()
        .all()
    )
    return [
        PersistedMediaPreviewAsset(
            id=UUID(str(row["id"])),
            asset_type=row["asset_type"],
            s3_bucket=row["s3_bucket"],
            s3_key=row["s3_key"],
            metadata=row["metadata"],
        )
        for row in rows
    ]


def upsert_asset(
    session: Session,
    *,
    user_id: str,
    media_id: str,
    job_id: str,
    asset_type: str,
    s3_bucket: str,
    s3_key: str,
    s3_region: str | None,
    mime_type: str,
    file_size_bytes: int,
    metadata: dict[str, Any],
) -> PersistedMediaPreviewAsset:
    row = (
        session.execute(
            text(
                """
                INSERT INTO generated_assets (
                  id,
                  user_id,
                  media_id,
                  job_id,
                  asset_type,
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
                  :job_id,
                  CAST(:asset_type AS "AssetType"),
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
                  job_id = EXCLUDED.job_id,
                  asset_type = EXCLUDED.asset_type,
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
                "job_id": job_id,
                "asset_type": asset_type,
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
    return PersistedMediaPreviewAsset(
        id=UUID(str(row["id"])),
        asset_type=row["asset_type"],
        s3_bucket=row["s3_bucket"],
        s3_key=row["s3_key"],
        metadata=row["metadata"],
    )
