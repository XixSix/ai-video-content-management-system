import logging
from typing import Any

from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.transcribe_handler import (
    TerminalTranscribeJobError,
    TranscribeJobMessage,
    increment_transcribe_job_attempt,
    process_transcribe_job,
    record_transcribe_job_failure,
)
from app.pipelines.transcribe.pipeline import TerminalTranscribePipelineError
from app.consumers.task_runner import run_consumer_task

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.transcribe_task_name,
    queue=settings.transcribe_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_transcribe_job(
    self,
    **kwargs: Any,
) -> dict[str, Any]:
    """Validate a transcribe task payload and apply terminal or retry handling."""
    return run_consumer_task(
        self,
        kwargs,
        message_model=TranscribeJobMessage,
        process_job=process_transcribe_job,
        record_failure=record_transcribe_job_failure,
        increment_attempt=increment_transcribe_job_attempt,
        terminal_errors=(
            TerminalTranscribeJobError,
            TerminalTranscribePipelineError,
        ),
        job_label="transcribe",
        error_prefix="TRANSCRIBE",
        logger=logger,
    )
