import logging
from typing import Any

from app.consumers.task_runner import run_consumer_task
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
    return run_consumer_task(
        self,
        kwargs,
        message_model=MediaPreviewJobMessage,
        process_job=process_media_preview_job,
        record_failure=record_media_preview_job_failure,
        increment_attempt=increment_media_preview_job_attempt,
        terminal_errors=(
            TerminalMediaPreviewJobError,
            TerminalMediaPreviewPipelineError,
        ),
        job_label="media preview",
        error_prefix="MEDIA_PREVIEW",
        logger=logger,
    )
