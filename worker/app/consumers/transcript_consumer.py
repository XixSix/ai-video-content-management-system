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

    try:
        message = TranscriptJobMessage.model_validate(kwargs)
        return process_transcript_job(message)
    except ValidationError as error:
        if job_id is not None:
            record_transcript_job_failure(job_id, f"Invalid transcript task payload: {error}")
        raise
    except TerminalTranscriptJobError as error:
        if job_id is not None:
            record_transcript_job_failure(job_id, str(error))
        raise
    except Exception as error:
        if job_id is None:
            raise

        attempt_count = increment_transcript_job_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            record_transcript_job_failure(job_id, str(error))
            raise

        try:
            raise self.retry(exc=error)
        except MaxRetriesExceededError:
            record_transcript_job_failure(job_id, str(error))
            raise
