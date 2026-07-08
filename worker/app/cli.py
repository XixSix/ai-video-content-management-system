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


def transcribe_worker() -> None:
    """Start the transcribe Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.transcribe_queue_name,
        default_hostname="transcribe@%h",
        log_level=settings.log_level,
    )


def transcript_worker() -> None:
    """Start the transcribe worker using the legacy command alias."""
    transcribe_worker()


def generate_chapters_worker() -> None:
    """Start the chapter generation Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.generate_chapters_queue_name,
        default_hostname="generate-chapters@%h",
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


def generate_short_clips_worker() -> None:
    """Start the short clip Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.generate_short_clips_queue_name,
        default_hostname="short-clip@%h",
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


def publish_worker() -> None:
    """Start the publish Celery worker."""
    configure_logging(settings.log_level)
    _run_worker(
        settings.publish_queue_name,
        default_hostname="publish@%h",
        log_level=settings.log_level,
    )
