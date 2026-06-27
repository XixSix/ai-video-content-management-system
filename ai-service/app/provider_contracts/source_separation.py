from pathlib import Path
from typing import Protocol


class SourceSeparationPort(Protocol):
    @property
    def model_name(self) -> str: ...

    def warm_up(self) -> None: ...

    def separate(self, local_path: Path) -> Path: ...
