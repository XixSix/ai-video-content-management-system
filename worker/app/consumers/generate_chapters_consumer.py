import logging
from typing import Any

from app.consumers.task_runner import run_consumer_task
from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.generate_chapters_handler import (
    TerminalGenerateChaptersJobError,
    GenerateChaptersJobMessage,
    increment_generate_chapters_job_attempt,
    process_generate_chapters_job,
    record_generate_chapters_job_failure,
)
from app.pipelines.generate_chapters.pipeline import (
    TerminalGenerateChaptersPipelineError,
)

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.generate_chapters_task_name,
    queue=settings.generate_chapters_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_generate_chapters_job(
    self,
    **kwargs: Any,
) -> dict[str, Any]:
    """Validate a generate chapters task payload and apply terminal or retry handling."""
    return run_consumer_task(
        self,
        kwargs,
        message_model=GenerateChaptersJobMessage,
        process_job=process_generate_chapters_job,
        record_failure=record_generate_chapters_job_failure,
        increment_attempt=increment_generate_chapters_job_attempt,
        terminal_errors=(
            TerminalGenerateChaptersJobError,
            TerminalGenerateChaptersPipelineError,
        ),
        job_label="generate chapters",
        error_prefix="GENERATE_CHAPTERS",
        logger=logger,
    )
