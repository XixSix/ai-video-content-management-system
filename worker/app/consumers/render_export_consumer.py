import logging
from typing import Any

from app.consumers.task_runner import run_consumer_task
from app.core.celery_app import celery_app
from app.core.config import settings
from app.handlers.render_export_handler import (
    TerminalRenderExportJobError,
    increment_render_export_job_attempt,
    process_render_export_job,
    record_render_export_job_failure,
)
from app.pipelines.render_export.pipeline import TerminalRenderExportPipelineError
from app.schemas.jobs.render_export_message import RenderExportJobMessage

logger = logging.getLogger(__name__)


@celery_app.task(
    name=settings.render_export_task_name,
    queue=settings.render_exports_queue_name,
    bind=True,
    max_retries=settings.task_max_retries,
    default_retry_delay=settings.task_default_retry_delay_seconds,
)
def handle_render_export_job(self, **kwargs: Any) -> dict[str, Any]:
    return run_consumer_task(
        self,
        kwargs,
        message_model=RenderExportJobMessage,
        process_job=process_render_export_job,
        record_failure=record_render_export_job_failure,
        increment_attempt=increment_render_export_job_attempt,
        terminal_errors=(
            TerminalRenderExportJobError,
            TerminalRenderExportPipelineError,
        ),
        job_label="render export",
        error_prefix="RENDER_EXPORT",
        logger=logger,
    )
