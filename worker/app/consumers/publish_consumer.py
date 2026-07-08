import logging
from typing import Any

from app.consumers.task_runner import run_consumer_task
from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.publish_handler import (
    TerminalPublishJobError,
    increment_publish_job_attempt,
    process_publish_job,
    record_publish_job_failure,
)
from app.pipelines.publish.pipeline import TerminalPublishPipelineError
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
    return run_consumer_task(
        self,
        kwargs,
        message_model=PublishJobMessage,
        process_job=process_publish_job,
        record_failure=record_publish_job_failure,
        increment_attempt=increment_publish_job_attempt,
        terminal_errors=(TerminalPublishJobError, TerminalPublishPipelineError),
        job_label="publish",
        error_prefix="PUBLISH",
        logger=logger,
    )
