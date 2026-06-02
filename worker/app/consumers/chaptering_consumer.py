import logging
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from pydantic import ValidationError

from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.chaptering_handler import (
    TerminalChapteringJobError,
    ChapteringJobMessage,
    increment_chaptering_job_attempt,
    process_chaptering_job,
    record_chaptering_job_failure,
)
from app.pipelines.chaptering.errors import TerminalChapteringPipelineError

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.chaptering_task_name,
    queue=settings.chaptering_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_chaptering_job(
    self,
    **kwargs: Any,
) -> dict[str, Any]:
    """Validate a chaptering task payload and apply terminal or retry handling."""
    raw_job_id = kwargs.get("jobId")
    job_id = raw_job_id if isinstance(raw_job_id, str) else None
    logger.info("Received chaptering job task job_id=%s", job_id or "unknown")

    try:
        message = ChapteringJobMessage.model_validate(kwargs)
        return process_chaptering_job(message)
    except ValidationError as error:
        logger.exception(
            "Invalid chaptering task payload job_id=%s", job_id or "unknown"
        )
        if job_id is not None:
            record_chaptering_job_failure(
                job_id, f"Invalid chaptering task payload: {error}"
            )
        raise
    except (TerminalChapteringJobError, TerminalChapteringPipelineError) as error:
        logger.warning(
            "Terminal chaptering job failure job_id=%s error=%s",
            job_id or "unknown",
            error,
        )
        if job_id is not None:
            record_chaptering_job_failure(job_id, str(error))
        raise
    except Exception as error:
        logger.exception(
            "Retryable chaptering job failure job_id=%s", job_id or "unknown"
        )
        if job_id is None:
            raise

        attempt_count = increment_chaptering_job_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            logger.error(
                "Chaptering job exhausted retries job_id=%s attempt_count=%s",
                job_id,
                attempt_count,
            )
            record_chaptering_job_failure(job_id, str(error))
            raise

        try:
            logger.warning(
                "Retrying chaptering job job_id=%s attempt_count=%s max_retries=%s",
                job_id,
                attempt_count,
                settings.task_max_retries,
            )
            raise self.retry(exc=error)
        except MaxRetriesExceededError:
            logger.exception(
                "Celery max retries exceeded for chaptering job job_id=%s", job_id
            )
            record_chaptering_job_failure(job_id, str(error))
            raise
