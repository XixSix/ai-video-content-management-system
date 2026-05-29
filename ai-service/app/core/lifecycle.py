from __future__ import annotations

import logging
import signal
import threading

import grpc

logger = logging.getLogger(__name__)


def create_stop_event() -> threading.Event:
    return threading.Event()


def register_signal_handlers(server: grpc.Server, stop_event: threading.Event) -> None:
    def handle_shutdown(signum: int, _frame: object) -> None:
        logger.info("ai-service shutdown requested signal=%d", signum)
        server.stop(grace=5)
        stop_event.set()

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
