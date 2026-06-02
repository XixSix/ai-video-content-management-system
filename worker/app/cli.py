import logging
import sys
from collections.abc import Sequence

from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.logging import configure_logging

logger = logging.getLogger(__name__)


def _run_worker(
    queue_name: str,
    *,
    log_level: str,
    argv: Sequence[str] | None = None,
) -> None:
    """Start a Celery worker for a single configured queue."""
    logger.info("Starting worker for queue %s", queue_name)
    celery_app.worker_main(
        [
            "worker",
            f"--loglevel={log_level.lower()}",
            "--queues",
            queue_name,
            *(argv if argv is not None else sys.argv[1:]),
        ]
    )


def transcript_worker() -> None:
    """Start the transcript Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(settings.transcript_queue_name, log_level=settings.log_level)


def chaptering_worker() -> None:
    """Start the chaptering Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(settings.chaptering_queue_name, log_level=settings.log_level)
