class WorkerError(Exception):
    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        self.error_code = error_code
        self.error_message = message
        super().__init__(f"{error_code}: {message}" if error_code else message)


class ServiceError(WorkerError):
    pass


class TerminalJobError(WorkerError):
    def __init__(self, message: str, *, error_code: str) -> None:
        super().__init__(message, error_code=error_code)


class TerminalPipelineError(WorkerError):
    def __init__(self, message: str, *, error_code: str) -> None:
        super().__init__(message, error_code=error_code)
