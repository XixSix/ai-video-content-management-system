from pathlib import Path


class TranscriptionWorkflowError(Exception):
    pass


class MissingTranscriptionFieldError(TranscriptionWorkflowError):
    def __init__(self, field_name: str) -> None:
        self.field_name = field_name
        super().__init__(f"{field_name} is required")


class LocalMediaNotFoundError(TranscriptionWorkflowError):
    def __init__(self, local_path: Path) -> None:
        self.local_path = local_path
        super().__init__(f"local_path does not exist: {local_path}")


class InvalidTranscriptResultError(TranscriptionWorkflowError):
    pass
