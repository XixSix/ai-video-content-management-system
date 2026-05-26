import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def find_processing_job(session: Session, job_id: str) -> dict[str, Any] | None:
    return session.execute(
        text(
            """
            SELECT
              id,
              media_id AS "mediaId",
              user_id AS "userId",
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
            FROM processing_jobs
            WHERE id = :job_id
            """
        ),
        {"job_id": job_id},
    ).mappings().one_or_none()


def mark_job_step(
    session: Session,
    job_id: str,
    *,
    status: str,
    progress: int,
    current_step: str,
) -> None:
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              status = :status,
              progress = :progress,
              current_step = :current_step,
              error_message = NULL,
              updated_at = :now,
              started_at = COALESCE(started_at, :now),
              completed_at = NULL
            WHERE id = :job_id
            """
        ),
        {
            "job_id": job_id,
            "status": status,
            "progress": progress,
            "current_step": current_step,
            "now": datetime.now(UTC),
        },
    )


def increment_attempt_count(session: Session, job_id: str) -> None:
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              attempt_count = attempt_count + 1,
              updated_at = :now
            WHERE id = :job_id
            """
        ),
        {"job_id": job_id, "now": datetime.now(UTC)},
    )


def mark_job_failed(session: Session, job_id: str, error_message: str) -> None:
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              status = 'FAILED',
              progress = COALESCE(progress, 0),
              current_step = 'Failed',
              error_message = :error_message,
              updated_at = :now,
              completed_at = :now
            WHERE id = :job_id
            """
        ),
        {
            "job_id": job_id,
            "error_message": error_message,
            "now": datetime.now(UTC),
        },
    )


def mark_job_completed(
    session: Session,
    job_id: str,
    *,
    output: dict[str, Any] | None = None,
) -> None:
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              status = 'COMPLETED',
              progress = 100,
              current_step = 'Completed',
              error_message = NULL,
              output = CAST(:output AS jsonb),
              updated_at = :now,
              completed_at = :now
            WHERE id = :job_id
            """
        ),
        {
            "job_id": job_id,
            "output": json.dumps(output or {}),
            "now": datetime.now(UTC),
        },
    )
