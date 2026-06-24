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
    default_hostname: str,
    log_level: str,
    argv: Sequence[str] | None = None,
) -> None:
    """Start a Celery worker for a single configured queue."""
    extra_args = list(argv if argv is not None else sys.argv[1:])
    hostname_args = (
        [] if _has_hostname_arg(extra_args) else ["--hostname", default_hostname]
    )

    logger.info("Starting worker for queue %s as %s", queue_name, default_hostname)
    celery_app.worker_main(
        [
            "worker",
            f"--loglevel={log_level.lower()}",
            "--queues",
            queue_name,
            *hostname_args,
            *extra_args,
        ]
    )


def _has_hostname_arg(argv: Sequence[str]) -> bool:
    """Return true when the caller provided a Celery worker hostname."""
    return any(
        arg == "-n" or arg == "--hostname" or arg.startswith("--hostname=")
        for arg in argv
    )


def transcript_worker() -> None:
    """Start the transcript Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.transcript_queue_name,
        default_hostname="transcript@%h",
        log_level=settings.log_level,
    )


def chaptering_worker() -> None:
    """Start the chaptering Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.chaptering_queue_name,
        default_hostname="chaptering@%h",
        log_level=settings.log_level,
    )


def media_previews_worker() -> None:
    """Start the media previews Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.media_previews_queue_name,
        default_hostname="media-previews@%h",
        log_level=settings.log_level,
    )


def render_exports_worker() -> None:
    """Start the render exports Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.render_exports_queue_name,
        default_hostname="render-exports@%h",
        log_level=settings.log_level,
    )
