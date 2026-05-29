from pathlib import Path
from typing import Protocol


class VadPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def apply(self, local_path: Path) -> Path: ...
