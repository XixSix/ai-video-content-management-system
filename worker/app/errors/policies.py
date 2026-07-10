from collections.abc import Collection
from typing import NoReturn, TypeVar

from app.errors import TerminalPipelineError, WorkerError

TerminalErrorT = TypeVar("TerminalErrorT", bound=TerminalPipelineError)


def raise_if_retryable(error: WorkerError, *, terminal_codes: Collection[str]) -> None:
    if error.error_code not in terminal_codes:
        raise error


def raise_terminal(
    error: WorkerError,
    terminal_error_type: type[TerminalErrorT],
    *,
    message: str | None = None,
    error_code: str | None = None,
) -> NoReturn:
    terminal_code = error_code or error.error_code

    if terminal_code is None:
        raise ValueError("Terminal errors must include an error_code")

    raise terminal_error_type(
        message or error.error_message,
        error_code=terminal_code,
    ) from error
