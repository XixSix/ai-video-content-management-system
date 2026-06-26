import logging
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from pydantic import ValidationError

from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.publish_handler import (
    TerminalPublishJobError,
    increment_publish_job_attempt,
    process_publish_job,
    record_publish_job_failure,
)
from app.schemas.jobs.publish_message import PublishJobMessage

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.publish_task_name,
    queue=settings.publish_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_publish_job(self, **kwargs: Any) -> dict[str, Any]:
    raw_job_id = kwargs.get("jobId")
    job_id = raw_job_id if isinstance(raw_job_id, str) else None
    logger.info("Received publish task job_id=%s", job_id or "unknown")

    try:
        message = PublishJobMessage.model_validate(kwargs)
        return process_publish_job(message)
    except ValidationError as error:
        logger.exception("Invalid publish task payload job_id=%s", job_id)
        if job_id is not None:
            record_publish_job_failure(
                job_id,
                f"Invalid publish task payload: {error}",
            )
        raise
    except TerminalPublishJobError as error:
        logger.warning(
            "Terminal publish failure job_id=%s error=%s",
            job_id or "unknown",
            error,
        )
        if job_id is not None:
            record_publish_job_failure(job_id, str(error))
        raise
    except Exception as error:
        logger.exception(
            "Retryable publish failure job_id=%s",
            job_id or "unknown",
        )
        if job_id is None:
            raise

        attempt_count = increment_publish_job_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            record_publish_job_failure(job_id, str(error))
            raise

        try:
            raise self.retry(exc=error)
        except MaxRetriesExceededError:
            record_publish_job_failure(job_id, str(error))
            raise
