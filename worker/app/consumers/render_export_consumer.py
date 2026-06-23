import logging
from typing import Any

from celery.exceptions import MaxRetriesExceededError
from pydantic import ValidationError

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
    raw_job_id = kwargs.get("jobId")
    job_id = raw_job_id if isinstance(raw_job_id, str) else None
    logger.info("Received render export task job_id=%s", job_id or "unknown")

    try:
        message = RenderExportJobMessage.model_validate(kwargs)
        return process_render_export_job(message)
    except ValidationError as error:
        logger.exception("Invalid render export task payload job_id=%s", job_id)
        if job_id is not None:
            record_render_export_job_failure(
                job_id,
                f"Invalid render export task payload: {error}",
            )
        raise
    except (
        TerminalRenderExportJobError,
        TerminalRenderExportPipelineError,
    ) as error:
        logger.warning(
            "Terminal render export failure job_id=%s error=%s",
            job_id or "unknown",
            error,
        )
        if job_id is not None:
            record_render_export_job_failure(job_id, str(error))
        raise
    except Exception as error:
        logger.exception(
            "Retryable render export failure job_id=%s",
            job_id or "unknown",
        )
        if job_id is None:
            raise

        attempt_count = increment_render_export_job_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            record_render_export_job_failure(job_id, str(error))
            raise

        try:
            raise self.retry(exc=error)
        except MaxRetriesExceededError:
            record_render_export_job_failure(job_id, str(error))
            raise
