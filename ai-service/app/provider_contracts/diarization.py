from pathlib import Path
from typing import Protocol


class DiarizationPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def diarize(self, local_path: Path) -> Path: ...
