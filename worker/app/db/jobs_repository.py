import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.db.processsing_job import JobStatus, ProcessingJobRow


def find_processing_job(session: Session, job_id: str) -> ProcessingJobRow | None:
    """Return the processing job row for a job id if it exists."""
    row = (
        session.execute(
            text(
                """
            SELECT
            id,
            media_id AS "mediaId",
            user_id AS "userId",
            project_id AS "projectId",
            job_type AS "jobType",
            status,
            progress,
            current_step AS "currentStep",
            error_code AS "errorCode",
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
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    return ProcessingJobRow.model_validate(dict(row))


def mark_job_queued_from_pending(
    session: Session,
    job_id: str,
    *,
    current_step: str = "Queued",
) -> ProcessingJobRow | None:
    """Atomically move a pending job to queued and return the claimed job row."""
    now = datetime.now(UTC)
    row = (
        session.execute(
            text(
                """
            UPDATE processing_jobs
            SET
              status = :queued_status,
              progress = :progress,
              current_step = :current_step,
              error_code = NULL,
              error_message = NULL,
              updated_at = :now,
              completed_at = NULL
            WHERE id = :job_id
              AND status = :pending_status
            RETURNING
              id,
              media_id AS "mediaId",
              user_id AS "userId",
              project_id AS "projectId",
              job_type AS "jobType",
              status,
              progress,
              current_step AS "currentStep",
              error_code AS "errorCode",
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
                "job_id": job_id,
                "queued_status": JobStatus.QUEUED.value,
                "progress": 0,
                "current_step": current_step,
                "pending_status": JobStatus.PENDING.value,
                "now": now,
            },
        )
        .mappings()
        .one_or_none()
    )

    if row is None:
        return None

    return ProcessingJobRow.model_validate(dict(row))


def mark_job_step(
    session: Session,
    job_id: str,
    *,
    status: JobStatus,
    progress: int,
    current_step: str,
) -> None:
    """Record the current worker step, progress, and running status for a job."""
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              status = :status,
              progress = :progress,
              current_step = :current_step,
              error_code = NULL,
              error_message = NULL,
              updated_at = :now,
              started_at = COALESCE(started_at, :now),
              completed_at = NULL
            WHERE id = :job_id
            """
        ),
        {
            "job_id": job_id,
            "status": status.value,
            "progress": progress,
            "current_step": current_step,
            "now": datetime.now(UTC),
        },
    )


def increment_attempt_count(session: Session, job_id: str) -> None:
    """Increase retry attempts and release the job so Celery retry can reclaim it."""
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              attempt_count = attempt_count + 1,
              status = :status,
              progress = 0,
              current_step = :current_step,
              error_code = NULL,
              error_message = NULL,
              updated_at = :now
            WHERE id = :job_id
            """
        ),
        {
            "job_id": job_id,
            "status": JobStatus.PENDING.value,
            "current_step": "Queued for retry",
            "now": datetime.now(UTC),
        },
    )


def mark_job_failed(
    session: Session,
    job_id: str,
    error_message: str,
    *,
    error_code: str | None = None,
) -> None:
    """Mark a processing job as failed with its terminal error code and message."""
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              status = :status,
              progress = COALESCE(progress, 0),
              current_step = 'Failed',
              error_code = :error_code,
              error_message = :error_message,
              updated_at = :now,
              completed_at = :now
            WHERE id = :job_id
            """
        ),
        {
            "job_id": job_id,
            "status": JobStatus.FAILED.value,
            "error_code": error_code,
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
    """Mark a processing job as completed and persist its output payload."""
    session.execute(
        text(
            """
            UPDATE processing_jobs
            SET
              status = :status,
              progress = 100,
              current_step = 'Completed',
              error_code = NULL,
              error_message = NULL,
              output = CAST(:output AS jsonb),
              updated_at = :now,
              completed_at = :now
            WHERE id = :job_id
            """
        ),
        {
            "job_id": job_id,
            "status": JobStatus.COMPLETED.value,
            "output": json.dumps(output or {}),
            "now": datetime.now(UTC),
        },
    )
