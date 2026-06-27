import logging
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from pydantic import ValidationError

from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.short_clip_handler import (
    TerminalShortClipJobError,
    increment_short_clip_job_attempt,
    process_short_clip_job,
    record_short_clip_job_failure,
)
from app.schemas.jobs.short_clip_message import ShortClipJobMessage

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.short_clip_task_name,
    queue=settings.short_clip_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_short_clip_job(self, **kwargs: Any) -> dict[str, Any]:
    raw_job_id = kwargs.get("jobId")
    job_id = raw_job_id if isinstance(raw_job_id, str) else None
    logger.info("Received short clip job task job_id=%s", job_id or "unknown")

    try:
        message = ShortClipJobMessage.model_validate(kwargs)
        return process_short_clip_job(message)
    except ValidationError as error:
        logger.exception(
            "Invalid short clip task payload job_id=%s", job_id or "unknown"
        )
        if job_id is not None:
            record_short_clip_job_failure(
                job_id, f"Invalid short clip task payload: {error}"
            )
        raise
    except TerminalShortClipJobError as error:
        logger.warning(
            "Terminal short clip job failure job_id=%s error=%s",
            job_id or "unknown",
            error,
        )
        if job_id is not None:
            record_short_clip_job_failure(job_id, str(error))
        raise
    except Exception as error:
        logger.exception(
            "Retryable short clip job failure job_id=%s", job_id or "unknown"
        )
        if job_id is None:
            raise

        attempt_count = increment_short_clip_job_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            logger.error(
                "Short clip job exhausted retries job_id=%s attempt_count=%s",
                job_id,
                attempt_count,
            )
            record_short_clip_job_failure(job_id, str(error))
            raise

        try:
            logger.warning(
                "Retrying short clip job job_id=%s attempt_count=%s max_retries=%s",
                job_id,
                attempt_count,
                settings.task_max_retries,
            )
            raise self.retry(exc=error)
        except MaxRetriesExceededError:
            logger.exception(
                "Celery max retries exceeded for short clip job job_id=%s", job_id
            )
            record_short_clip_job_failure(job_id, str(error))
            raise
