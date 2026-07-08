import logging
from collections.abc import Callable
from typing import Any, Protocol, TypeVar

from celery.exceptions import MaxRetriesExceededError
from pydantic import BaseModel, ValidationError

from app.core.config import settings

MessageT = TypeVar("MessageT", bound=BaseModel)


class RetryableTask(Protocol):
    def retry(self, *, exc: BaseException) -> Any: ...


RecordFailure = Callable[..., None]


def run_consumer_task(
    task: RetryableTask,
    kwargs: dict[str, Any],
    *,
    message_model: type[MessageT],
    process_job: Callable[[MessageT], dict[str, Any]],
    record_failure: RecordFailure,
    increment_attempt: Callable[[str], int | None],
    terminal_errors: tuple[type[Exception], ...],
    job_label: str,
    error_prefix: str,
    logger: logging.Logger,
    record_error_code: bool = True,
) -> dict[str, Any]:
    raw_job_id = kwargs.get("jobId")
    job_id = raw_job_id if isinstance(raw_job_id, str) else None
    logger.info("Received %s task job_id=%s", job_label, job_id or "unknown")

    try:
        message = message_model.model_validate(kwargs)
        return process_job(message)
    except ValidationError as error:
        logger.exception("Invalid %s task payload job_id=%s", job_label, job_id)
        if job_id is not None:
            _record_failure(
                record_failure,
                job_id,
                f"Invalid {job_label} task payload: {error}",
                error_code=f"{error_prefix}_PAYLOAD_INVALID",
                record_error_code=record_error_code,
            )
        raise
    except terminal_errors as error:
        logger.warning(
            "Terminal %s failure job_id=%s error=%s",
            job_label,
            job_id or "unknown",
            error,
        )
        if job_id is not None:
            _record_failure(
                record_failure,
                job_id,
                str(error),
                error_code=getattr(error, "error_code", None),
                record_error_code=record_error_code,
            )
        raise
    except Exception as error:
        logger.exception(
            "Retryable %s failure job_id=%s",
            job_label,
            job_id or "unknown",
        )
        if job_id is None:
            raise

        attempt_count = increment_attempt(job_id)

        if attempt_count is not None and attempt_count >= settings.task_max_retries:
            logger.error(
                "%s job exhausted retries job_id=%s attempt_count=%s",
                job_label.capitalize(),
                job_id,
                attempt_count,
            )
            _record_failure(
                record_failure,
                job_id,
                str(error),
                error_code=f"{error_prefix}_RETRIES_EXHAUSTED",
                record_error_code=record_error_code,
            )
            raise

        try:
            logger.warning(
                "Retrying %s job job_id=%s attempt_count=%s max_retries=%s",
                job_label,
                job_id,
                attempt_count,
                settings.task_max_retries,
            )
            raise task.retry(exc=error)
        except MaxRetriesExceededError:
            logger.exception(
                "Celery max retries exceeded for %s job job_id=%s",
                job_label,
                job_id,
            )
            _record_failure(
                record_failure,
                job_id,
                str(error),
                error_code=f"{error_prefix}_RETRIES_EXHAUSTED",
                record_error_code=record_error_code,
            )
            raise


def _record_failure(
    record_failure: RecordFailure,
    job_id: str,
    error_message: str,
    *,
    error_code: str | None,
    record_error_code: bool,
) -> None:
    if record_error_code:
        record_failure(job_id, error_message, error_code=error_code)
        return

    record_failure(job_id, error_message)
