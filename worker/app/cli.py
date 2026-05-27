import sys
from collections.abc import Sequence

from app.core.celery_app import celery_app
from app.core.config import settings


def _run_worker(queue_name: str, argv: Sequence[str] | None = None) -> None:
    """Start a Celery worker for a single configured queue."""
    celery_app.worker_main(
        [
            "worker",
            "--loglevel=info",
            "--queues",
            queue_name,
            *(argv if argv is not None else sys.argv[1:]),
        ]
    )


def transcript_worker() -> None:
    """Start the transcript Celery worker."""
    _run_worker(settings.transcript_queue_name)
