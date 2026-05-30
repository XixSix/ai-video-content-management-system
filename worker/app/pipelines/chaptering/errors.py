class TerminalChapteringPipelineError(Exception):
    """Represent a non-retryable chaptering pipeline failure."""

    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        super().__init__(f"{error_code}: {message}" if error_code else message)
