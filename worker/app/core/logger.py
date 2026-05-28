from __future__ import annotations

import logging
import sys


LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def configure_logging(level: str | int = logging.INFO) -> None:
    logging.basicConfig(
        level=_resolve_log_level(level),
        format=LOG_FORMAT,
        stream=sys.stdout,
        force=True,
    )


def _resolve_log_level(level: str | int) -> int:
    if isinstance(level, int):
        return level

    resolved = getattr(logging, level.upper(), logging.INFO)

    return resolved if isinstance(resolved, int) else logging.INFO
