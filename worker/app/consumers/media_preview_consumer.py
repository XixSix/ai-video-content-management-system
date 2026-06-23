import logging
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from pydantic import ValidationError

from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.media_preview_handler import (
    TerminalMediaPreviewJobError,
    increment_media_preview_job_attempt,
    process_media_preview_job,
    record_media_preview_job_failure,
)
from app.pipelines.media_preview.pipeline import TerminalMediaPreviewPipelineError
from app.schemas.jobs.media_preview_message import MediaPreviewJobMessage

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.media_preview_task_name,
    queue=settings.media_previews_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_media_preview_job(self, **kwargs: Any) -> dict[str, Any]:
    raw_job_id = kwargs.get("jobId")
    job_id = raw_job_id if isinstance(raw_job_id, str) else None
    logger.info("Received media preview task job_id=%s", job_id or "unknown")

    try:
        message = MediaPreviewJobMessage.model_validate(kwargs)
        return process_media_preview_job(message)
    except ValidationError as error:
        logger.exception("Invalid media preview task payload job_id=%s", job_id)
        if job_id is not None:
            record_media_preview_job_failure(
                job_id,
                f"Invalid media preview task payload: {error}",
            )
        raise
    except (
        TerminalMediaPreviewJobError,
        TerminalMediaPreviewPipelineError,
    ) as error:
        logger.warning(
            "Terminal media preview failure job_id=%s error=%s",
            job_id or "unknown",
            error,
        )
        if job_id is not None:
            record_media_preview_job_failure(job_id, str(error))
        raise
    except Exception as error:
        logger.exception(
            "Retryable media preview failure job_id=%s",
            job_id or "unknown",
        )
        if job_id is None:
            raise

        attempt_count = increment_media_preview_job_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            record_media_preview_job_failure(job_id, str(error))
            raise

        try:
            raise self.retry(exc=error)
        except MaxRetriesExceededError:
            record_media_preview_job_failure(job_id, str(error))
            raise
