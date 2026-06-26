import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.db.processsing_job import ProcessingJobRow


@dataclass(frozen=True)
class PublishTaskRow:
    id: UUID
    user_id: UUID
    media_id: UUID | None
    project_id: UUID | None
    short_clip_id: UUID | None
    platform_account_id: UUID | None
    job_id: UUID | None
    platform: str
    status: str
    title: str | None
    caption: str | None
    description: str | None
    hashtags: Any
    platform_post_id: str | None
    platform_post_url: str | None


@dataclass(frozen=True)
class PlatformAccountRow:
    id: UUID
    workspace_id: UUID
    platform: str
    platform_user_id: str | None
    status: str
    access_token_encrypted: str | None
    refresh_token_encrypted: str | None
    expires_at: datetime | None


@dataclass(frozen=True)
class PublishAssetRow:
    id: UUID
    s3_bucket: str
    s3_key: str
    asset_type: str


@dataclass(frozen=True)
class PublishSourceRow:
    id: UUID
    source_type: str
    s3_bucket: str
    s3_key: str
    mime_type: str | None
    file_size_bytes: int | None
    filename: str


@dataclass(frozen=True)
class PublishDispatch:
    job: ProcessingJobRow
    message: dict[str, Any]
    eta: datetime | None


def find_publish_task(session: Session, publish_task_id: str) -> PublishTaskRow | None:
    row = (
        session.execute(
            text(
                """
                SELECT
                  id,
                  user_id,
                  media_id,
                  project_id,
                  short_clip_id,
                  platform_account_id,
                  job_id,
                  platform::text AS platform,
                  status::text AS status,
                  title,
                  caption,
                  description,
                  hashtags,
                  platform_post_id,
                  platform_post_url
                FROM publish_tasks
                WHERE id = :publish_task_id
                """
            ),
            {"publish_task_id": publish_task_id},
        )
        .mappings()
        .one_or_none()
    )

    return _publish_task_from_row(row) if row else None


def find_platform_account(
    session: Session,
    platform_account_id: str,
) -> PlatformAccountRow | None:
    row = (
        session.execute(
            text(
                """
                SELECT
                  id,
                  workspace_id,
                  platform::text AS platform,
                  platform_user_id,
                  status::text AS status,
                  access_token_encrypted,
                  refresh_token_encrypted,
                  expires_at
                FROM platform_accounts
                WHERE id = :platform_account_id
                """
            ),
            {"platform_account_id": platform_account_id},
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    return PlatformAccountRow(
        id=UUID(str(row["id"])),
        workspace_id=UUID(str(row["workspace_id"])),
        platform=row["platform"],
        platform_user_id=row["platform_user_id"],
        status=row["status"],
        access_token_encrypted=row["access_token_encrypted"],
        refresh_token_encrypted=row["refresh_token_encrypted"],
        expires_at=row["expires_at"],
    )


def find_export_asset(session: Session, asset_id: str) -> PublishAssetRow | None:
    row = (
        session.execute(
            text(
                """
                SELECT
                  id,
                  s3_bucket,
                  s3_key,
                  asset_type::text AS asset_type
                FROM generated_assets
                WHERE id = :asset_id
                  AND asset_type = 'EXPORT_VIDEO'
                """
            ),
            {"asset_id": asset_id},
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    return PublishAssetRow(
        id=UUID(str(row["id"])),
        s3_bucket=row["s3_bucket"],
        s3_key=row["s3_key"],
        asset_type=row["asset_type"],
    )


def target_exists_for_publish_task(
    session: Session,
    task: PublishTaskRow,
    *,
    export_asset_id: str | None,
) -> bool:
    if task.media_id is not None:
        return _exists(
            session,
            "SELECT 1 FROM media WHERE id = :id AND status = 'UPLOADED' AND type = 'VIDEO'",
            str(task.media_id),
        )

    if task.short_clip_id is not None:
        return _exists(
            session,
            "SELECT 1 FROM short_clips WHERE id = :id AND status = 'READY' AND video_path IS NOT NULL",
            str(task.short_clip_id),
        )

    if task.project_id is not None and export_asset_id is not None:
        return find_export_asset(session, export_asset_id) is not None

    return False


def find_publish_source(
    session: Session,
    task: PublishTaskRow,
    *,
    export_asset_id: str | None,
) -> PublishSourceRow | None:
    if task.media_id is not None:
        row = (
            session.execute(
                text(
                    """
                    SELECT
                      id,
                      'MEDIA' AS source_type,
                      s3_bucket,
                      s3_key,
                      mime_type,
                      file_size_bytes,
                      original_filename AS filename
                    FROM media
                    WHERE id = :id
                      AND status = 'UPLOADED'
                      AND type = 'VIDEO'
                    """
                ),
                {"id": str(task.media_id)},
            )
            .mappings()
            .one_or_none()
        )
        return _publish_source_from_row(row) if row else None

    if task.short_clip_id is not None:
        row = (
            session.execute(
                text(
                    """
                    SELECT
                      sc.id,
                      'SHORT_CLIP' AS source_type,
                      m.s3_bucket,
                      sc.video_path AS s3_key,
                      COALESCE(m.mime_type, 'video/mp4') AS mime_type,
                      NULL AS file_size_bytes,
                      COALESCE(sc.title, m.original_filename, sc.id::text) AS filename
                    FROM short_clips sc
                    JOIN media m ON m.id = sc.media_id
                    WHERE sc.id = :id
                      AND sc.status = 'READY'
                      AND sc.video_path IS NOT NULL
                    """
                ),
                {"id": str(task.short_clip_id)},
            )
            .mappings()
            .one_or_none()
        )
        return _publish_source_from_row(row) if row else None

    if task.project_id is not None and export_asset_id is not None:
        row = (
            session.execute(
                text(
                    """
                    SELECT
                      id,
                      'PROJECT_EXPORT' AS source_type,
                      s3_bucket,
                      s3_key,
                      mime_type,
                      file_size_bytes,
                      s3_key AS filename
                    FROM generated_assets
                    WHERE id = :id
                      AND asset_type = 'EXPORT_VIDEO'
                    """
                ),
                {"id": export_asset_id},
            )
            .mappings()
            .one_or_none()
        )
        return _publish_source_from_row(row) if row else None

    return None


def update_platform_account_credentials(
    session: Session,
    platform_account_id: str,
    *,
    access_token_encrypted: str,
    refresh_token_encrypted: str | None,
    expires_at: datetime | None,
) -> None:
    session.execute(
        text(
            """
            UPDATE platform_accounts
            SET
              access_token_encrypted = :access_token_encrypted,
              refresh_token_encrypted = :refresh_token_encrypted,
              expires_at = :expires_at,
              status = 'CONNECTED',
              updated_at = :now
            WHERE id = :platform_account_id
            """
        ),
        {
            "platform_account_id": platform_account_id,
            "access_token_encrypted": access_token_encrypted,
            "refresh_token_encrypted": refresh_token_encrypted,
            "expires_at": expires_at,
            "now": datetime.now(UTC),
        },
    )


def mark_publish_task_publishing(
    session: Session,
    publish_task_id: str,
    job_id: str,
) -> None:
    session.execute(
        text(
            """
            UPDATE publish_tasks
            SET
              status = 'PUBLISHING',
              job_id = :job_id,
              error_message = NULL,
              updated_at = :now
            WHERE id = :publish_task_id
              AND status <> 'CANCELED'
            """
        ),
        {
            "publish_task_id": publish_task_id,
            "job_id": job_id,
            "now": datetime.now(UTC),
        },
    )


def mark_publish_task_published(
    session: Session,
    publish_task_id: str,
    *,
    platform_post_id: str,
    platform_post_url: str,
) -> None:
    now = datetime.now(UTC)
    session.execute(
        text(
            """
            UPDATE publish_tasks
            SET
              status = 'PUBLISHED',
              published_at = :now,
              platform_post_id = :platform_post_id,
              platform_post_url = :platform_post_url,
              error_message = NULL,
              updated_at = :now
            WHERE id = :publish_task_id
            """
        ),
        {
            "publish_task_id": publish_task_id,
            "platform_post_id": platform_post_id,
            "platform_post_url": platform_post_url,
            "now": now,
        },
    )


def mark_publish_task_failed(
    session: Session,
    publish_task_id: str,
    error_message: str,
) -> None:
    session.execute(
        text(
            """
            UPDATE publish_tasks
            SET
              status = 'FAILED',
              error_message = :error_message,
              updated_at = :now
            WHERE id = :publish_task_id
              AND status <> 'CANCELED'
            """
        ),
        {
            "publish_task_id": publish_task_id,
            "error_message": error_message,
            "now": datetime.now(UTC),
        },
    )


def mark_publish_task_failed_for_render_job(
    session: Session,
    render_job_id: str,
    error_message: str,
) -> None:
    session.execute(
        text(
            """
            UPDATE publish_tasks
            SET
              status = 'FAILED',
              error_message = :error_message,
              updated_at = :now
            WHERE job_id = :render_job_id
              AND status <> 'CANCELED'
            """
        ),
        {
            "render_job_id": render_job_id,
            "error_message": error_message,
            "now": datetime.now(UTC),
        },
    )


def create_publish_job_from_render(
    session: Session,
    *,
    render_job: ProcessingJobRow,
    publish_task_id: str,
    export_asset_id: str,
    scheduled_at: datetime | None,
) -> PublishDispatch | None:
    task = find_publish_task(session, publish_task_id)

    if task is None or task.status == "CANCELED":
        return None

    job_input = {
        "publishTaskId": str(task.id),
        "mediaId": None,
        "projectId": str(task.project_id) if task.project_id else None,
        "shortClipId": None,
        "exportAssetId": export_asset_id,
        "platform": task.platform,
        "platformAccountId": str(task.platform_account_id)
        if task.platform_account_id
        else None,
        "scheduledAt": scheduled_at.isoformat() if scheduled_at else None,
    }
    row = (
        session.execute(
            text(
                """
                INSERT INTO processing_jobs (
                  media_id,
                  user_id,
                  project_id,
                  job_type,
                  status,
                  progress,
                  queue_name,
                  task_name,
                  input,
                  created_at,
                  updated_at
                )
                VALUES (
                  :media_id,
                  :user_id,
                  :project_id,
                  'PUBLISH',
                  'PENDING',
                  0,
                  :queue_name,
                  :task_name,
                  CAST(:input AS jsonb),
                  :now,
                  :now
                )
                RETURNING
                  id,
                  media_id AS "mediaId",
                  user_id AS "userId",
                  project_id AS "projectId",
                  job_type AS "jobType",
                  status,
                  progress,
                  current_step AS "currentStep",
                  error_message AS "errorMessage",
                  queue_name AS "queueName",
                  task_name AS "taskName",
                  external_task_id AS "externalTaskId",
                  attempt_count AS "attemptCount",
                  input,
                  output,
                  created_at AS "createdAt",
                  updated_at AS "updatedAt",
                  started_at AS "startedAt",
                  completed_at AS "completedAt"
                """
            ),
            {
                "media_id": str(render_job.media_id),
                "user_id": str(render_job.user_id),
                "project_id": str(render_job.project_id)
                if render_job.project_id
                else None,
                "queue_name": settings.publish_queue_name,
                "task_name": settings.publish_task_name,
                "input": json.dumps(job_input),
                "now": datetime.now(UTC),
            },
        )
        .mappings()
        .one()
    )
    publish_job = ProcessingJobRow.model_validate(dict(row))

    session.execute(
        text(
            """
            UPDATE publish_tasks
            SET
              job_id = :job_id,
              status = :status,
              error_message = NULL,
              updated_at = :now
            WHERE id = :publish_task_id
            """
        ),
        {
            "publish_task_id": publish_task_id,
            "job_id": str(publish_job.id),
            "status": "SCHEDULED" if scheduled_at else "PUBLISHING",
            "now": datetime.now(UTC),
        },
    )

    message = {
        "jobId": str(publish_job.id),
        **job_input,
        "userId": str(render_job.user_id),
        "taskName": "publish",
    }

    return PublishDispatch(job=publish_job, message=message, eta=scheduled_at)


def _exists(session: Session, sql: str, row_id: str) -> bool:
    return (
        session.execute(text(sql), {"id": row_id}).mappings().one_or_none() is not None
    )


def _publish_task_from_row(row: Any) -> PublishTaskRow:
    return PublishTaskRow(
        id=UUID(str(row["id"])),
        user_id=UUID(str(row["user_id"])),
        media_id=UUID(str(row["media_id"])) if row["media_id"] else None,
        project_id=UUID(str(row["project_id"])) if row["project_id"] else None,
        short_clip_id=UUID(str(row["short_clip_id"])) if row["short_clip_id"] else None,
        platform_account_id=UUID(str(row["platform_account_id"]))
        if row["platform_account_id"]
        else None,
        job_id=UUID(str(row["job_id"])) if row["job_id"] else None,
        platform=row["platform"],
        status=row["status"],
        title=row["title"],
        caption=row["caption"],
        description=row["description"],
        hashtags=row["hashtags"],
        platform_post_id=row["platform_post_id"],
        platform_post_url=row["platform_post_url"],
    )


def _publish_source_from_row(row: Any) -> PublishSourceRow:
    return PublishSourceRow(
        id=UUID(str(row["id"])),
        source_type=row["source_type"],
        s3_bucket=row["s3_bucket"],
        s3_key=row["s3_key"],
        mime_type=row["mime_type"],
        file_size_bytes=int(row["file_size_bytes"])
        if row["file_size_bytes"] is not None
        else None,
        filename=row["filename"],
    )
