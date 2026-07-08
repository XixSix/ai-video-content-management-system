import logging
from typing import Any

from app.consumers.task_runner import run_consumer_task
from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.generate_short_clips_handler import (
    TerminalGenerateShortClipsJobError,
    increment_generate_short_clips_job_attempt,
    process_generate_short_clips_job,
    record_generate_short_clips_job_failure,
)
from app.pipelines.generate_short_clips.pipeline import (
    TerminalGenerateShortClipsPipelineError,
)
from app.schemas.jobs.generate_short_clips_message import GenerateShortClipsJobMessage

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.generate_short_clips_task_name,
    queue=settings.generate_short_clips_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_generate_short_clips_job(self, **kwargs: Any) -> dict[str, Any]:
    return run_consumer_task(
        self,
        kwargs,
        message_model=GenerateShortClipsJobMessage,
        process_job=process_generate_short_clips_job,
        record_failure=record_generate_short_clips_job_failure,
        increment_attempt=increment_generate_short_clips_job_attempt,
        terminal_errors=(
            TerminalGenerateShortClipsJobError,
            TerminalGenerateShortClipsPipelineError,
        ),
        job_label="generate short clips",
        error_prefix="GENERATE_SHORT_CLIPS",
        logger=logger,
    )
