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
    job_id = kwargs.get("jobId")

    try:
        message = TranscriptJobMessage.model_validate(kwargs)
        return process_transcript_job(message)
    except ValidationError as error:
        if isinstance(job_id, str):
            record_transcript_job_failure(job_id, f"Invalid transcript task payload: {error}")
        raise
    except TerminalTranscriptJobError as error:
        if isinstance(job_id, str):
            record_transcript_job_failure(job_id, str(error))
        raise
    except Exception as error:
        if not isinstance(job_id, str):
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
