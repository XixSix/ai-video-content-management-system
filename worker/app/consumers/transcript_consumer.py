import logging
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from pydantic import ValidationError

from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.transcript_handler import (
    TerminalTranscriptJobError,
    TranscriptJobMessage,
    increment_transcript_job_attempt,
    process_transcript_job,
    record_transcript_job_failure,
)

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.transcript_task_name,
    queue=settings.transcript_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_transcript_job(
    self,
    **kwargs: Any,
) -> dict[str, Any]:
    """Validate a transcript task payload and apply terminal or retry handling."""
    raw_job_id = kwargs.get("jobId")
    job_id = raw_job_id if isinstance(raw_job_id, str) else None
    logger.info("Received transcript job task job_id=%s", job_id or "unknown")

    try:
        message = TranscriptJobMessage.model_validate(kwargs)
        return process_transcript_job(message)
    except ValidationError as error:
        logger.exception(
            "Invalid transcript task payload job_id=%s", job_id or "unknown"
        )
        if job_id is not None:
            record_transcript_job_failure(
                job_id, f"Invalid transcript task payload: {error}"
            )
        raise
    except TerminalTranscriptJobError as error:
        logger.warning(
            "Terminal transcript job failure job_id=%s error=%s",
            job_id or "unknown",
            error,
        )
        if job_id is not None:
            record_transcript_job_failure(job_id, str(error))
        raise
    except Exception as error:
        logger.exception(
            "Retryable transcript job failure job_id=%s", job_id or "unknown"
        )
        if job_id is None:
            raise

        attempt_count = increment_transcript_job_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            logger.error(
                "Transcript job exhausted retries job_id=%s attempt_count=%s",
                job_id,
                attempt_count,
            )
            record_transcript_job_failure(job_id, str(error))
            raise

        try:
            logger.warning(
                "Retrying transcript job job_id=%s attempt_count=%s max_retries=%s",
                job_id,
                attempt_count,
                settings.task_max_retries,
            )
            raise self.retry(exc=error)
        except MaxRetriesExceededError:
            logger.exception(
                "Celery max retries exceeded for transcript job job_id=%s", job_id
            )
            record_transcript_job_failure(job_id, str(error))
            raise
